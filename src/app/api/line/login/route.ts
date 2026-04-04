import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getPublicAppBaseUrl } from "@/lib/app-url";

function misconfigHtml(title: string, detail: string) {
  return `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:32rem;margin:auto;line-height:1.5"><h1 style="font-size:1.125rem">${title}</h1><p style="color:#444">${detail}</p><p style="font-size:0.875rem;color:#666">ตรวจสอบไฟล์ <code>.env</code> และ Callback URL ใน LINE Developers ให้ตรงกับ <code>https://โดเมนของคุณ/api/line/callback</code></p></body></html>`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const appUrl = getPublicAppBaseUrl();
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET?.trim() ?? "";

  if (!channelId || !channelSecret) {
    return new Response(
      misconfigHtml(
        "ยังไม่ได้ตั้งค่า LINE Login",
        "กำหนด LINE_LOGIN_CHANNEL_ID และ LINE_LOGIN_CHANNEL_SECRET ใน environment ของเซิร์ฟเวอร์"
      ),
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!/^https?:\/\//i.test(appUrl)) {
    return new Response(
      misconfigHtml(
        "NEXT_PUBLIC_APP_URL ไม่ถูกต้อง",
        "ต้องเป็น URL เต็ม เช่น https://your-domain.com หรือ http://localhost:3000 (ไม่มี slash ท้าย) เพื่อให้ redirect_uri ของ OAuth ถูกต้อง"
      ),
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const state = randomBytes(16).toString("hex");
  const callbackUrl = `${appUrl}/api/line/callback`;

  // mode: "link" = ผูกบัญชีที่ login อยู่แล้ว, "login" = เข้าสู่ระบบด้วย LINE
  const mode = session ? "link" : "login";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
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
  cookieStore.set("line_oauth_mode", mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? (mode === "link" ? "/profile" : "/home");
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
