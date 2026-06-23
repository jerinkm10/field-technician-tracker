-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

UPDATE "Customer"
SET
  "billingAddress" = COALESCE("billingAddress", "address"),
  "shippingAddress" = COALESCE("shippingAddress", "address"),
  "placeOfSupply" = COALESCE("placeOfSupply", 'Karnataka'),
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Customer"
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice"
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "termsAndConditions" TEXT;

UPDATE "Invoice" AS "invoice"
SET "customerId" = "customer"."id"
FROM "Customer" AS "customer"
WHERE "customer"."name" = "invoice"."customerName";

UPDATE "Invoice"
SET "customerId" = (
  SELECT "id"
  FROM "Customer"
  ORDER BY "id"
  LIMIT 1
)
WHERE "customerId" IS NULL;

ALTER TABLE "Invoice"
ALTER COLUMN "customerId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "supplierId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "customerGstin" TEXT NOT NULL,
    "placeOfSupply" TEXT NOT NULL,
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "totalBeforeTax" DOUBLE PRECISION NOT NULL,
    "totalTaxAmount" DOUBLE PRECISION NOT NULL,
    "roundedOff" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "productServiceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsnSac" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "cgstAmount" DOUBLE PRECISION NOT NULL,
    "cgstPercentage" DOUBLE PRECISION NOT NULL,
    "sgstAmount" DOUBLE PRECISION NOT NULL,
    "sgstPercentage" DOUBLE PRECISION NOT NULL,
    "lineAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceInputField" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "placeholder" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceInputField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_gstin_key" ON "Customer"("gstin");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_gstin_idx" ON "Customer"("gstin");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_quotationDate_idx" ON "Quotation"("quotationDate");

-- CreateIndex
CREATE INDEX "Quotation_validUntil_idx" ON "Quotation"("validUntil");

-- CreateIndex
CREATE INDEX "Quotation_supplierId_idx" ON "Quotation"("supplierId");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- CreateIndex
CREATE INDEX "QuotationLineItem_quotationId_idx" ON "QuotationLineItem"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceInputField_fieldKey_key" ON "InvoiceInputField"("fieldKey");

-- CreateIndex
CREATE INDEX "InvoiceInputField_section_idx" ON "InvoiceInputField"("section");

-- CreateIndex
CREATE INDEX "InvoiceInputField_isActive_idx" ON "InvoiceInputField"("isActive");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
