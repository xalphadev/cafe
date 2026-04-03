/**
 * LINE Notify - send message to a user's LINE
 * Requires user to connect their LINE Notify token in profile
 */
export async function sendLineNotify(token: string, message: string): Promise<void> {
  try {
    await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });
  } catch {
    // Silent fail — notification is non-critical
  }
}

export const ORDER_STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: "[ยืนยันแล้ว] ร้านรับออเดอร์ของคุณแล้ว กำลังเตรียมอาหาร",
  READY: "[พร้อมแล้ว] อาหารของคุณพร้อมแล้ว รอไรเดอร์มารับ",
  PICKED_UP: "[รับแล้ว] ไรเดอร์รับอาหารแล้ว กำลังออกเดินทาง",
  DELIVERING: "[กำลังส่ง] ไรเดอร์กำลังส่งอาหารมาหาคุณ",
  COMPLETED: "[ส่งถึงแล้ว] อาหารส่งถึงแล้ว! ขอบคุณที่ใช้บริการ",
  CANCELLED: "[ยกเลิก] ออเดอร์ของคุณถูกยกเลิกแล้ว",
};
