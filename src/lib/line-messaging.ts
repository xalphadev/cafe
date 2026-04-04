import { createHmac } from "crypto";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

type TextMessage = { type: "text"; text: string };
type FlexMessage = { type: "flex"; altText: string; contents: object };
type LineMessage = TextMessage | FlexMessage;

function authHeader() {
  return {
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function pushMessage(lineUserId: string, messages: LineMessage[]): Promise<void> {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ to: lineUserId, messages }),
    });
  } catch {
    // Silent fail — notification is non-critical
  }
}

export async function replyMessage(replyToken: string, messages: LineMessage[]): Promise<void> {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn("[LINE] LINE_CHANNEL_ACCESS_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ replyToken, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[LINE] replyMessage failed ${res.status}:`, body);
    }
  } catch (err) {
    console.error("[LINE] replyMessage error:", err);
  }
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;
  const hash = createHmac("sha256", secret).update(body).digest("base64");
  return hash === signature;
}

export const ORDER_STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED:  "✅ ร้านรับออเดอร์ของคุณแล้ว กำลังเตรียมอาหาร",
  PREPARING:  "👨‍🍳 กำลังเตรียมอาหารของคุณ รอสักครู่นะ",
  READY:      "🎉 อาหารพร้อมแล้ว! รอไรเดอร์มารับ",
  PICKED_UP:  "🛵 ไรเดอร์รับอาหารแล้ว กำลังออกเดินทาง",
  DELIVERING: "📍 ไรเดอร์กำลังส่งอาหารมาหาคุณ",
  COMPLETED:  "🏠 ส่งถึงแล้ว! ขอบคุณที่ใช้บริการ",
  CANCELLED:  "❌ ออเดอร์ของคุณถูกยกเลิกแล้ว",
};

export function buildOrderFlexMessage(
  orderId: string,
  status: string,
  appUrl: string
): FlexMessage {
  const statusText = ORDER_STATUS_MESSAGES[status] ?? status;
  const shortId = orderId.slice(-8).toUpperCase();

  return {
    type: "flex",
    altText: `อัปเดตออเดอร์ #${shortId}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#2D7A47",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📦 อัปเดตออเดอร์",
            color: "#ffffff",
            size: "sm",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: `ออเดอร์ #${shortId}`,
            weight: "bold",
            size: "md",
            color: "#111827",
          },
          {
            type: "text",
            text: statusText,
            size: "sm",
            color: "#6b7280",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2D7A47",
            height: "sm",
            action: {
              type: "uri",
              label: "ดูรายละเอียด",
              uri: `${appUrl}/orders/${orderId}`,
            },
          },
        ],
      },
    },
  };
}
