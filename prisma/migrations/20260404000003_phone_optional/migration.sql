-- AlterTable: make phone nullable (LINE-only users don't need phone)
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
