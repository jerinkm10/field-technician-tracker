ALTER TABLE "Amc"
ADD COLUMN "termsAndConditions" TEXT;

ALTER TABLE "AmcInvoice"
ADD COLUMN "amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "AmcInvoice" AS "amcInvoice"
SET "amount" = "invoice"."totalAmount"
FROM "Invoice" AS "invoice"
WHERE "invoice"."id" = "amcInvoice"."invoiceId";

UPDATE "Amc"
SET "termsAndConditions" = COALESCE(
  (
    SELECT "Company"."amcTermsAndConditions"
    FROM "Company"
    ORDER BY "Company"."updatedAt" DESC
    LIMIT 1
  ),
  'AMC visits will be scheduled as per the agreed billing cycle. Emergency breakdown support is subject to contract scope.'
)
WHERE "termsAndConditions" IS NULL;

ALTER TABLE "AmcInvoice"
ADD CONSTRAINT "AmcInvoice_amcId_billingPeriodStart_billingPeriodEnd_key"
UNIQUE ("amcId", "billingPeriodStart", "billingPeriodEnd");
