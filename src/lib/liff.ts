import type { Liff } from "@line/liff";

let liffInstance: Liff | null = null;
let initialized = false;

export async function initLiff(): Promise<Liff | null> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;

  if (initialized && liffInstance) return liffInstance;

  try {
    const liff = (await import("@line/liff")).default;
    await liff.init({ liffId });
    liffInstance = liff;
    initialized = true;
    return liff;
  } catch {
    return null;
  }
}

export function isInLineApp(): boolean {
  if (typeof window === "undefined") return false;
  return /Line/i.test(navigator.userAgent);
}
