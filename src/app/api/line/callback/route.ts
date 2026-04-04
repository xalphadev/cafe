import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

type LineTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
};

type LineProfileResponse = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!session) {
    return Response.redirect(`${appUrl}/login?error=unauthenticated`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("line_oauth_state")?.value;
  const returnTo = cookieStore.get("line_oauth_return_to")?.value ?? "/profile";

  cookieStore.delete("line_oauth_state");
  cookieStore.delete("line_oauth_return_to");

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`${appUrl}${returnTo}?line_error=cancelled`);
  }

  if (!savedState || state !== savedState) {
    return Response.redirect(`${appUrl}${returnTo}?line_error=invalid_state`);
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
      return Response.redirect(`${appUrl}${returnTo}?line_error=token_failed`);
    }

    const tokenData: LineTokenResponse = await tokenRes.json();

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return Response.redirect(`${appUrl}${returnTo}?line_error=profile_failed`);
    }

    const profile: LineProfileResponse = await profileRes.json();

    const existing = await prisma.user.findUnique({
      where: { lineUserId: profile.userId },
    });

    if (existing && existing.id !== session.userId) {
      return Response.redirect(`${appUrl}${returnTo}?line_error=already_linked`);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { lineUserId: profile.userId },
    });

    return Response.redirect(`${appUrl}${returnTo}?line_success=1`);
  } catch {
    return Response.redirect(`${appUrl}${returnTo}?line_error=server_error`);
  }
}
