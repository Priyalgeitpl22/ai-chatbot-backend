/*
  Warnings:

  - You are about to drop the `ApiData` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CancelRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ApiData" DROP CONSTRAINT "ApiData_orgId_fkey";

-- DropTable
DROP TABLE "ApiData";

-- CreateTable
CREATE TABLE "SubscriptionCancelRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orgPlanId" INTEGER NOT NULL,
    "requestedById" TEXT,
    "reason" TEXT,
    "feedback" TEXT,
    "status" "CancelRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCancelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequest_orgId_idx" ON "SubscriptionCancelRequest"("orgId");

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequest_orgPlanId_idx" ON "SubscriptionCancelRequest"("orgPlanId");

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequest_status_idx" ON "SubscriptionCancelRequest"("status");

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequest" ADD CONSTRAINT "SubscriptionCancelRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequest" ADD CONSTRAINT "SubscriptionCancelRequest_orgPlanId_fkey" FOREIGN KEY ("orgPlanId") REFERENCES "OrganizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequest" ADD CONSTRAINT "SubscriptionCancelRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
