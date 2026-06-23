-- CreateEnum
CREATE TYPE "ProductServiceType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProductServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "ProductService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductServiceType" NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSacCode" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "defaultRate" DOUBLE PRECISION NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL,
    "status" "ProductServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductService_name_idx" ON "ProductService"("name");

-- CreateIndex
CREATE INDEX "ProductService_type_idx" ON "ProductService"("type");

-- CreateIndex
CREATE INDEX "ProductService_status_idx" ON "ProductService"("status");

-- CreateIndex
CREATE INDEX "ProductService_hsnSacCode_idx" ON "ProductService"("hsnSacCode");
