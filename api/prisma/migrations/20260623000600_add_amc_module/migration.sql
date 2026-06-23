-- CreateEnum
CREATE TYPE "AmcBillingPeriod" AS ENUM ('QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AmcStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Amc" (
    "id" TEXT NOT NULL,
    "amcNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "billingPeriod" "AmcBillingPeriod" NOT NULL,
    "billingPeriodMonths" INTEGER NOT NULL,
    "contractAmount" DOUBLE PRECISION NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL,
    "status" "AmcStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastPaidDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmcInvoice" (
    "id" TEXT NOT NULL,
    "amcId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmcInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amc_amcNumber_key" ON "Amc"("amcNumber");

-- CreateIndex
CREATE INDEX "Amc_amcNumber_idx" ON "Amc"("amcNumber");

-- CreateIndex
CREATE INDEX "Amc_customerId_idx" ON "Amc"("customerId");

-- CreateIndex
CREATE INDEX "Amc_branchId_idx" ON "Amc"("branchId");

-- CreateIndex
CREATE INDEX "Amc_startDate_idx" ON "Amc"("startDate");

-- CreateIndex
CREATE INDEX "Amc_endDate_idx" ON "Amc"("endDate");

-- CreateIndex
CREATE INDEX "Amc_billingPeriod_idx" ON "Amc"("billingPeriod");

-- CreateIndex
CREATE INDEX "Amc_status_idx" ON "Amc"("status");

-- CreateIndex
CREATE INDEX "Amc_nextBillingDate_idx" ON "Amc"("nextBillingDate");

-- CreateIndex
CREATE UNIQUE INDEX "AmcInvoice_invoiceId_key" ON "AmcInvoice"("invoiceId");

-- CreateIndex
CREATE INDEX "AmcInvoice_amcId_idx" ON "AmcInvoice"("amcId");

-- CreateIndex
CREATE INDEX "AmcInvoice_billingPeriodStart_idx" ON "AmcInvoice"("billingPeriodStart");

-- CreateIndex
CREATE INDEX "AmcInvoice_billingPeriodEnd_idx" ON "AmcInvoice"("billingPeriodEnd");

-- AddForeignKey
ALTER TABLE "Amc" ADD CONSTRAINT "Amc_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amc" ADD CONSTRAINT "Amc_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcInvoice" ADD CONSTRAINT "AmcInvoice_amcId_fkey" FOREIGN KEY ("amcId") REFERENCES "Amc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmcInvoice" ADD CONSTRAINT "AmcInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
