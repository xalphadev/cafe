/** Base URL ของแอป (ไม่มี slash ท้าย) — ใช้ร่วมกับ LINE OAuth redirect_uri */
export function getPublicAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}
