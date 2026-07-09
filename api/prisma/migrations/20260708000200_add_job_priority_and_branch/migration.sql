CREATE TYPE "JobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "Job"
ADD COLUMN "branchId" TEXT,
ADD COLUMN "priority" "JobPriority" NOT NULL DEFAULT 'MEDIUM';

CREATE INDEX "Job_branchId_idx" ON "Job"("branchId");
CREATE INDEX "Job_priority_idx" ON "Job"("priority");

ALTER TABLE "Job"
ADD CONSTRAINT "Job_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Supplier"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
