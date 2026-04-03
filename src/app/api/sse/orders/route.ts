import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = await verifyToken(token);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected" });

      let lastStatus = "";
      let attempts = 0;
      const maxAttempts = 180; // 15 min

      const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
          send({ type: "timeout" });
          controller.close();
          return;
        }

        try {
          const where = orderId
            ? { id: orderId, userId: session.userId }
            : session.role === "ADMIN"
            ? {}
            : { userId: session.userId };

          if (orderId) {
            const order = await prisma.order.findFirst({ where });
            if (order && order.status !== lastStatus) {
              lastStatus = order.status;
              send({ type: "order_update", status: order.status, orderId: order.id });
            }
          } else if (session.role === "ADMIN") {
            const recentOrder = await prisma.order.findFirst({
              where: { createdAt: { gt: new Date(Date.now() - 5000) } },
              orderBy: { createdAt: "desc" },
            });
            if (recentOrder) {
              send({ type: "new_order", orderId: recentOrder.id });
            }
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
