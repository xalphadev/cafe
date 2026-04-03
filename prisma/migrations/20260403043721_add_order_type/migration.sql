-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'DELIVERY';
