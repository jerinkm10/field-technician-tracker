ALTER TABLE "Lead"
ADD COLUMN "assignedToEmployeeId" TEXT;

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_assignedToEmployeeId_fkey"
FOREIGN KEY ("assignedToEmployeeId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Lead_assignedToEmployeeId_idx" ON "Lead"("assignedToEmployeeId");
