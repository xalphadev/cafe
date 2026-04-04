import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { unauthorized } from "@/lib/response";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const state = randomBytes(16).toString("hex");
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/line/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    redirect_uri: callbackUrl,
    state,
    scope: "profile openid",
    nonce: randomBytes(8).toString("hex"),
  });

  const cookieStore = await cookies();
  cookieStore.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/profile";
  cookieStore.set("line_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  return Response.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );
}
