-- CreateEnum
CREATE TYPE "ProductServiceHistoryAction" AS ENUM (
  'CREATE',
  'EDIT',
  'RATE_CHANGE',
  'TAX_CHANGE',
  'STATUS_CHANGE',
  'DEACTIVATE',
  'DELETE'
);

-- CreateTable
CREATE TABLE "ProductServiceHistory" (
  "id" TEXT NOT NULL,
  "productServiceId" TEXT,
  "productServiceName" TEXT NOT NULL,
  "action" "ProductServiceHistoryAction" NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "note" TEXT,
  "changedById" TEXT,
  "changedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductServiceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductServiceHistory_productServiceId_idx" ON "ProductServiceHistory"("productServiceId");

-- CreateIndex
CREATE INDEX "ProductServiceHistory_action_idx" ON "ProductServiceHistory"("action");

-- CreateIndex
CREATE INDEX "ProductServiceHistory_createdAt_idx" ON "ProductServiceHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductServiceHistory"
ADD CONSTRAINT "ProductServiceHistory_productServiceId_fkey"
FOREIGN KEY ("productServiceId") REFERENCES "ProductService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductServiceHistory"
ADD CONSTRAINT "ProductServiceHistory_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
