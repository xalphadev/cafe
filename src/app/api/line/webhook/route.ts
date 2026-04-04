import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, replyMessage } from "@/lib/line-messaging";

type LineEvent = {
  type: string;
  replyToken?: string;
  source: { userId?: string; type: string };
  message?: { type: string; text?: string };
};

type WebhookBody = {
  destination: string;
  events: LineEvent[];
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body: WebhookBody = JSON.parse(rawBody);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  await Promise.all(
    body.events.map(async (event) => {
      const lineUserId = event.source.userId;
      if (!lineUserId) return;

      if (event.type === "follow") {
        const user = await prisma.user.findFirst({ where: { lineUserId } });
        const name = user?.name ? `คุณ${user.name}` : "คุณ";

        await replyMessage(event.replyToken!, [
          {
            type: "flex",
            altText: `ยินดีต้อนรับ ${name}!`,
            contents: {
              type: "bubble",
              size: "kilo",
              header: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#22c55e",
                paddingAll: "16px",
                contents: [
                  { type: "text", text: "👋 ยินดีต้อนรับ!", color: "#ffffff", weight: "bold", size: "md" },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                paddingAll: "16px",
                contents: [
                  { type: "text", text: `สวัสดี ${name}`, weight: "bold", size: "md", color: "#111827" },
                  {
                    type: "text",
                    text: "ขอบคุณที่ติดตามเรา สั่งอาหารง่ายๆ ผ่าน LINE ได้เลย!",
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
                    color: "#22c55e",
                    height: "sm",
                    action: {
                      type: "uri",
                      label: "🍽 สั่งอาหารเลย",
                      uri: `${appUrl}/menu`,
                    },
                  },
                ],
              },
            },
          },
        ]);
        return;
      }

      if (event.type === "message" && event.message?.type === "text") {
        const text = (event.message.text ?? "").trim().toLowerCase();

        if (["เมนู", "menu", "สั่งอาหาร"].includes(text)) {
          await replyMessage(event.replyToken!, [
            { type: "text", text: `🍽 ดูเมนูได้ที่นี่เลย:\n${appUrl}/menu` },
          ]);
        } else if (["ออเดอร์", "order", "คำสั่งซื้อ"].includes(text)) {
          await replyMessage(event.replyToken!, [
            { type: "text", text: `📦 ดูออเดอร์ของคุณได้ที่:\n${appUrl}/orders` },
          ]);
        } else if (["แต้ม", "point", "points"].includes(text)) {
          await replyMessage(event.replyToken!, [
            { type: "text", text: `⭐ ดูแต้มสะสมได้ที่:\n${appUrl}/profile` },
          ]);
        } else if (["โปรโมชั่น", "โปรโม", "promo", "coupon", "คูปอง"].includes(text)) {
          await replyMessage(event.replyToken!, [
            { type: "text", text: `🎁 ดูโปรโมชั่นและคูปองได้ที่:\n${appUrl}/profile` },
          ]);
        } else if (["สวัสดี", "hello", "hi"].includes(text)) {
          await replyMessage(event.replyToken!, [
            { type: "text", text: "สวัสดีครับ! 😊 พิมพ์ \"เมนู\" เพื่อดูรายการอาหาร หรือ \"ออเดอร์\" เพื่อติดตามคำสั่งซื้อ" },
          ]);
        }
      }
    })
  );

  return new Response("OK", { status: 200 });
}
