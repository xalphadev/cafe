import { randomBytes } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

function safeFileSegment(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "file";
}

export function isS3UploadConfigured(): boolean {
  return !!(
    process.env.S3_ENDPOINT?.trim() &&
    process.env.S3_ACCESS_KEY?.trim() &&
    process.env.S3_SECRET_KEY?.trim() &&
    process.env.S3_BUCKET?.trim() &&
    process.env.S3_PUBLIC_BASE_URL?.trim()
  );
}

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION?.trim() || "us-east-1",
    endpoint: process.env.S3_ENDPOINT!.trim(),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!.trim(),
      secretAccessKey: process.env.S3_SECRET_KEY!.trim(),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  });
}

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e: unknown) {
    const err = e as { $metadata?: { httpStatusCode?: number }; name?: string };
    const status = err.$metadata?.httpStatusCode;
    if (status === 404 || err.name === "NotFound") {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    throw e;
  }
}

/** URL ที่เบราว์เซอร์เปิดได้ — S3_PUBLIC_BASE_URL ไม่มี slash ท้าย (อาจรวม path ถึง bucket แล้ว เช่น https://โดเมน/minio/cafe-shop) */
function publicObjectUrl(key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL!.trim().replace(/\/$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${path}`;
}

export async function uploadToS3(
  file: File,
  folder: string
): Promise<{ url: string; publicId: string }> {
  const bucket = process.env.S3_BUCKET!.trim();
  const client = getS3Client();
  await ensureBucket(client, bucket);

  const folderClean = folder.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
  const key = `${folderClean}/${Date.now()}-${randomBytes(4).toString("hex")}-${safeFileSegment(file.name)}`;

  const body = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { url: publicObjectUrl(key), publicId: key };
}
