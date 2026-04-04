import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

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

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
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
    return Response.redirect(`${appUrl}${dest}?line_error=cancelled`);
  }

  if (!savedState || state !== savedState) {
    const dest = mode === "login" ? "/login" : returnTo;
    return Response.redirect(`${appUrl}${dest}?line_error=invalid_state`);
  }

  try {
    const callbackUrl = `${appUrl}/api/line/callback`;

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
      return Response.redirect(`${appUrl}${dest}?line_error=token_failed`);
    }

    const tokenData: LineTokenResponse = await tokenRes.json();

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const dest = mode === "login" ? "/login" : returnTo;
      return Response.redirect(`${appUrl}${dest}?line_error=profile_failed`);
    }

    const lineProfile: LineProfileResponse = await profileRes.json();

    // ── LOGIN MODE ─────────────────────────────────────────────────────────────
    if (mode === "login") {
      const user = await prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });

      if (user && user.isActive) {
        // User exists → สร้าง session แล้ว redirect ไป home
        const token = await signToken({ userId: user.id, role: user.role, phone: user.phone ?? undefined });
        const res = Response.redirect(`${appUrl}/home?line_login=1`);
        const cookieHeader = `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
        res.headers.set("Set-Cookie", cookieHeader);
        return res;
      }

      // User ไม่มีใน DB → สร้างบัญชีใหม่ด้วย LINE ทันที ไม่ต้องการเบอร์โทร
      const newUser = await prisma.user.create({
        data: {
          phone: null,
          name: lineProfile.displayName,
          lineUserId: lineProfile.userId,
        },
      });
      const newToken = await signToken({ userId: newUser.id, role: newUser.role });
      const newRes = Response.redirect(`${appUrl}/home?line_login=1`);
      newRes.headers.set(
        "Set-Cookie",
        `auth-token=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
      );
      return newRes;
    }

    // ── LINK MODE ──────────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session) {
      return Response.redirect(`${appUrl}/login?line_error=unauthenticated`);
    }

    const existing = await prisma.user.findUnique({
      where: { lineUserId: lineProfile.userId },
    });

    if (existing && existing.id !== session.userId) {
      return Response.redirect(`${appUrl}${returnTo}?line_error=already_linked`);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { lineUserId: lineProfile.userId },
    });

    return Response.redirect(`${appUrl}${returnTo}?line_success=1`);
  } catch {
    const dest = mode === "login" ? "/login" : returnTo;
    return Response.redirect(`${appUrl}${dest}?line_error=server_error`);
  }
}
