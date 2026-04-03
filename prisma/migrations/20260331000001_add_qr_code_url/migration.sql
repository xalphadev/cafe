-- Add qrCodeUrl to shop_settings
ALTER TABLE "shop_settings" ADD COLUMN IF NOT EXISTS "qrCodeUrl" TEXT;
