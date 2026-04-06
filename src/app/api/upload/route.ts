import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";
import { isS3UploadConfigured, uploadToS3 } from "@/lib/s3-upload";

async function uploadToCloudinary(file: File, folder: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
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
  if (!res.ok) {
    return { error: (data.error?.message as string) ?? "อัปโหลดไม่สำเร็จ" };
  }
  return { url: data.secure_url as string, publicId: data.public_id as string };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) return error("ไม่มีไฟล์");

    if (isS3UploadConfigured()) {
      try {
        const { url, publicId } = await uploadToS3(file, folder);
        return ok({ url, publicId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[upload S3]", msg);
        return error("อัปโหลดไปที่พื้นที่จัดเก็บไม่สำเร็จ");
      }
    }

    const cloud = await uploadToCloudinary(file, folder);
    if (cloud && "error" in cloud) return error(cloud.error ?? "อัปโหลดไม่สำเร็จ");
    if (cloud && "url" in cloud) return ok({ url: cloud.url, publicId: cloud.publicId });

    return error(
      "ยังไม่ได้ตั้งค่าที่เก็บไฟล์ — ใส่ MinIO/S3 (S3_*) หรือ Cloudinary ใน environment"
    );
  } catch {
    return error("เกิดข้อผิดพลาดในการอัปโหลด");
  }
}
