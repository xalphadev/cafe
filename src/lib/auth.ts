import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "./jwt";

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string, otp: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || "mock";

  if (provider === "mock") {
    console.log(`[SMS MOCK] Phone: ${phone} | OTP: ${otp}`);
    return;
  }

  // TODO: Integrate real SMS provider (Twilio, Thai SMS API)
}
