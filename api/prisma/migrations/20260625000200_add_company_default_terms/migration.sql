-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "invoiceTermsAndConditions" TEXT,
ADD COLUMN "proformaTermsAndConditions" TEXT,
ADD COLUMN "quotationTermsAndConditions" TEXT,
ADD COLUMN "amcTermsAndConditions" TEXT;
