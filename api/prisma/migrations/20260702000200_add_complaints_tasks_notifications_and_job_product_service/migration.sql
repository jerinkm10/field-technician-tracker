CREATE TYPE "ComplaintContactPerson" AS ENUM (
  'BANK_MANAGER',
  'ASSISTANT_MANAGER',
  'STAFF',
  'OWNER',
  'OTHER'
);

CREATE TYPE "ComplaintStatus" AS ENUM (
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'CONVERTED_TO_JOB',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "TaskPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TYPE "TaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE'
);

CREATE TYPE "TaskReferenceType" AS ENUM (
  'OUTSTANDING',
  'LEAD',
  'JOB',
  'AMC_RENEWAL',
  'COMPLAINT'
);

CREATE TYPE "NotificationReferenceType" AS ENUM (
  'LEAD',
  'JOB',
  'AMC',
  'OUTSTANDING',
  'TASK',
  'COMPLAINT'
);

ALTER TABLE "Job"
ADD COLUMN "productServiceId" TEXT,
ALTER COLUMN "technicianId" DROP NOT NULL;

ALTER TABLE "Lead"
ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE TABLE "Complaint" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "contactPerson" "ComplaintContactPerson" NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "address" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "complaintTitle" TEXT NOT NULL,
  "complaintDescription" TEXT NOT NULL,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
  "assignedEmployeeId" TEXT,
  "notes" TEXT,
  "jobId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "customerId" TEXT,
  "assignedEmployeeId" TEXT NOT NULL,
  "referenceType" "TaskReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "sourceSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmployeeTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "referenceType" "NotificationReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Complaint_jobId_key" ON "Complaint"("jobId");
CREATE INDEX "Complaint_customerId_idx" ON "Complaint"("customerId");
CREATE INDEX "Complaint_assignedEmployeeId_idx" ON "Complaint"("assignedEmployeeId");
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

CREATE INDEX "EmployeeTask_customerId_idx" ON "EmployeeTask"("customerId");
CREATE INDEX "EmployeeTask_assignedEmployeeId_idx" ON "EmployeeTask"("assignedEmployeeId");
CREATE INDEX "EmployeeTask_priority_idx" ON "EmployeeTask"("priority");
CREATE INDEX "EmployeeTask_dueDate_idx" ON "EmployeeTask"("dueDate");
CREATE INDEX "EmployeeTask_status_idx" ON "EmployeeTask"("status");
CREATE UNIQUE INDEX "EmployeeTask_assignedEmployeeId_referenceType_referenceId_key"
ON "EmployeeTask"("assignedEmployeeId", "referenceType", "referenceId");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX "Job_productServiceId_idx" ON "Job"("productServiceId");
CREATE INDEX "Lead_assignedAt_idx" ON "Lead"("assignedAt");

ALTER TABLE "Job"
ADD CONSTRAINT "Job_productServiceId_fkey"
FOREIGN KEY ("productServiceId") REFERENCES "ProductService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job"
DROP CONSTRAINT "Job_technicianId_fkey",
ADD CONSTRAINT "Job_technicianId_fkey"
FOREIGN KEY ("technicianId") REFERENCES "Technician"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Complaint"
ADD CONSTRAINT "Complaint_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Complaint"
ADD CONSTRAINT "Complaint_assignedEmployeeId_fkey"
FOREIGN KEY ("assignedEmployeeId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Complaint"
ADD CONSTRAINT "Complaint_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployeeTask"
ADD CONSTRAINT "EmployeeTask_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployeeTask"
ADD CONSTRAINT "EmployeeTask_assignedEmployeeId_fkey"
FOREIGN KEY ("assignedEmployeeId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
