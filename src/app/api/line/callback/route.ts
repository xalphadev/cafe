import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { getPublicAppBaseUrl } from "@/lib/app-url";

type LineTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

type LineProfileResponse = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

function resolveBase(request: NextRequest): string {
  return getPublicAppBaseUrl() || request.nextUrl.origin;
}

function redirectTo(request: NextRequest, pathWithQuery: string) {
  const base = resolveBase(request);
  return NextResponse.redirect(new URL(pathWithQuery, `${base}/`));
}

function redirectHomeWithSession(request: NextRequest, token: string) {
  const base = resolveBase(request);
  const res = NextResponse.redirect(new URL("/home?line_login=1", `${base}/`));
  res.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const savedState = cookieStore.get("line_oauth_state")?.value;
  const mode = cookieStore.get("line_oauth_mode")?.value ?? "link";
  const returnTo = cookieStore.get("line_oauth_return_to")?.value ?? "/profile";

  cookieStore.delete("line_oauth_state");
  cookieStore.delete("line_oauth_mode");
  cookieStore.delete("line_oauth_return_to");

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const lineError = searchParams.get("error");

  if (lineError || !code) {
    const dest = mode === "login" ? "/login" : returnTo;
    return redirectTo(request, `${dest}?line_error=cancelled`);
  }

  if (!savedState || state !== savedState) {
    const dest = mode === "login" ? "/login" : returnTo;
    return redirectTo(request, `${dest}?line_error=invalid_state`);
  }

  try {
    const oauthBase = getPublicAppBaseUrl();
    if (!oauthBase) {
      return redirectTo(request, "/login?line_error=misconfigured");
    }
    const callbackUrl = `${oauthBase}/api/line/callback`;

    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
      }),
    });

    if (!tokenRes.ok) {
      const dest = mode === "login" ? "/login" : returnTo;
      return redirectTo(request, `${dest}?line_error=token_failed`);
    }

    const tokenData: LineTokenResponse = await tokenRes.json();

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const dest = mode === "login" ? "/login" : returnTo;
      return redirectTo(request, `${dest}?line_error=profile_failed`);
    }

    const lineProfile: LineProfileResponse = await profileRes.json();

    // ── LOGIN MODE ─────────────────────────────────────────────────────────────
    if (mode === "login") {
      const user = await prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });

      if (user && user.isActive) {
        const token = await signToken({
          userId: user.id,
          role: user.role,
          phone: user.phone ?? undefined,
        });
        return redirectHomeWithSession(request, token);
      }

      const newUser = await prisma.user.create({
        data: {
          phone: null,
          name: lineProfile.displayName,
          lineUserId: lineProfile.userId,
        },
      });
      const newToken = await signToken({ userId: newUser.id, role: newUser.role });
      return redirectHomeWithSession(request, newToken);
    }

    // ── LINK MODE ──────────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session) {
      return redirectTo(request, "/login?line_error=unauthenticated");
    }

    const existing = await prisma.user.findUnique({
      where: { lineUserId: lineProfile.userId },
    });

    if (existing && existing.id !== session.userId) {
      return redirectTo(request, `${returnTo}?line_error=already_linked`);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { lineUserId: lineProfile.userId },
    });

    return redirectTo(request, `${returnTo}?line_success=1`);
  } catch {
    const dest = mode === "login" ? "/login" : returnTo;
    return redirectTo(request, `${dest}?line_error=server_error`);
  }
}
