import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, replyMessage, buildOrderFlexMessage, ORDER_STATUS_MESSAGES } from "@/lib/line-messaging";

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
                backgroundColor: "#06C755",
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
                    color: "#06C755",
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

        try {
          if (["เมนู", "menu", "สั่งอาหาร"].includes(text)) {
            await replyMessage(event.replyToken!, [
              { type: "text", text: `🍽 ดูเมนูได้ที่นี่เลย:\n${appUrl}/menu` },
            ]);
          } else if (["ออเดอร์", "order", "คำสั่งซื้อ"].includes(text)) {
            const user = await prisma.user.findFirst({ where: { lineUserId } });

            if (!user) {
              await replyMessage(event.replyToken!, [
                { type: "text", text: `📦 กรุณาเข้าสู่ระบบก่อนนะครับ:\n${appUrl}/menu` },
              ]);
              return;
            }

            const latestOrder = await prisma.order.findFirst({
              where: {
                userId: user.id,
                status: { notIn: ["PENDING_PAYMENT"] },
              },
              orderBy: { createdAt: "desc" },
              include: {
                items: { include: { product: { select: { name: true } } } },
              },
            });

            if (latestOrder) {
              const statusText = ORDER_STATUS_MESSAGES[latestOrder.status] ?? latestOrder.status;
              const shortId = latestOrder.id.slice(-8).toUpperCase();
              const itemLines = latestOrder.items
                .slice(0, 3)
                .map((i) => `• ${i.product.name} x${i.quantity}`)
                .join("\n");
              const moreItems = latestOrder.items.length > 3 ? `\n+${latestOrder.items.length - 3} รายการ` : "";

              await replyMessage(event.replyToken!, [
                {
                  type: "flex",
                  altText: `ออเดอร์ล่าสุด #${shortId}`,
                  contents: {
                    type: "bubble",
                    size: "kilo",
                    header: {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#06C755",
                      paddingAll: "16px",
                      contents: [
                        { type: "text", text: "📦 ออเดอร์ล่าสุดของคุณ", color: "#ffffff", weight: "bold", size: "sm" },
                      ],
                    },
                    body: {
                      type: "box",
                      layout: "vertical",
                      spacing: "sm",
                      paddingAll: "16px",
                      contents: [
                        { type: "text", text: `#${shortId}`, weight: "bold", size: "md", color: "#111827" },
                        { type: "text", text: statusText, size: "sm", color: "#06C755", margin: "sm", wrap: true },
                        { type: "separator", margin: "md" },
                        { type: "text", text: itemLines + moreItems, size: "sm", color: "#6b7280", margin: "md", wrap: true },
                        {
                          type: "box",
                          layout: "horizontal",
                          margin: "md",
                          contents: [
                            { type: "text", text: "ยอดรวม", size: "sm", color: "#6b7280" },
                            { type: "text", text: `฿${latestOrder.total.toFixed(2)}`, size: "sm", color: "#111827", weight: "bold", align: "end" },
                          ],
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
                          color: "#06C755",
                          height: "sm",
                          action: { type: "uri", label: "ดูรายละเอียด", uri: `${appUrl}/orders/${latestOrder.id}` },
                        },
                      ],
                    },
                  },
                },
              ]);
            } else {
              await replyMessage(event.replyToken!, [
                { type: "text", text: `📦 ยังไม่มีออเดอร์ในขณะนี้\nสั่งอาหารได้ที่:\n${appUrl}/menu` },
              ]);
            }
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
        } catch (err) {
          console.error("[LINE Webhook] Error handling message:", err);
          await replyMessage(event.replyToken!, [
            { type: "text", text: "ขออภัย เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง 🙏" },
          ]).catch(() => {});
        }
      }
    })
  );

  return new Response("OK", { status: 200 });
}
