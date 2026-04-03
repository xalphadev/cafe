import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) return error("ไม่มีไฟล์");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return error("ยังไม่ได้ตั้งค่า Cloudinary");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const { createHash } = await import("crypto");
    const signature = createHash("sha1").update(signaturePayload).digest("hex");

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("folder", folder);
    uploadForm.append("timestamp", timestamp.toString());
    uploadForm.append("api_key", apiKey);
    uploadForm.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadForm,
    });

    const data = await res.json();
    if (!res.ok) return error(data.error?.message ?? "อัปโหลดไม่สำเร็จ");

    return ok({ url: data.secure_url, publicId: data.public_id });
  } catch {
    return error("เกิดข้อผิดพลาดในการอัปโหลด");
  }
}
