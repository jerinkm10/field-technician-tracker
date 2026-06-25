-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN_OWNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYEE';

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "User"
ALTER COLUMN "email" DROP NOT NULL;

-- Backfill data for existing rows before making the new columns required.
UPDATE "User"
SET "username" = CONCAT('user_', SUBSTRING("id", 1, 8))
WHERE "username" IS NULL;

UPDATE "User" AS "user"
SET "phone" = "technician"."phone"
FROM "Technician" AS "technician"
WHERE "technician"."userId" = "user"."id"
  AND "user"."phone" IS NULL;

UPDATE "User"
SET "phone" = CONCAT('TEMP-', SUBSTRING("id", 1, 8))
WHERE "phone" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_status_idx" ON "User"("status");
