-- Link admins, employees, and technicians to a home branch for branch-scoped access.
ALTER TABLE "User" ADD COLUMN "branchId" TEXT;

CREATE INDEX "User_branchId_idx" ON "User"("branchId");

ALTER TABLE "User"
ADD CONSTRAINT "User_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Supplier"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

