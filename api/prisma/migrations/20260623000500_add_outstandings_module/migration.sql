-- CreateEnum
CREATE TYPE "OutstandingStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "Outstanding" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingAmount" DOUBLE PRECISION NOT NULL,
    "status" "OutstandingStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outstanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Outstanding_invoiceId_key" ON "Outstanding"("invoiceId");

-- CreateIndex
CREATE INDEX "Outstanding_invoiceType_idx" ON "Outstanding"("invoiceType");

-- CreateIndex
CREATE INDEX "Outstanding_invoiceNumber_idx" ON "Outstanding"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Outstanding_customerId_idx" ON "Outstanding"("customerId");

-- CreateIndex
CREATE INDEX "Outstanding_invoiceDate_idx" ON "Outstanding"("invoiceDate");

-- CreateIndex
CREATE INDEX "Outstanding_dueDate_idx" ON "Outstanding"("dueDate");

-- CreateIndex
CREATE INDEX "Outstanding_status_idx" ON "Outstanding"("status");

-- AddForeignKey
ALTER TABLE "Outstanding" ADD CONSTRAINT "Outstanding_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outstanding" ADD CONSTRAINT "Outstanding_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
