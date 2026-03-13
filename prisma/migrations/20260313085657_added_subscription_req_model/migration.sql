-- CreateEnum
CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "OrganizationPlan" ADD COLUMN     "agentsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dynamicDataUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userSessionsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "requestedById" TEXT,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "requesteeName" TEXT NOT NULL,
    "requesteeEmail" TEXT NOT NULL,
    "requesteePhone" TEXT,
    "totalCost" DECIMAL(65,30),
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionRequestAddOn" (
    "id" TEXT NOT NULL,
    "subscriptionRequestId" TEXT NOT NULL,
    "addOnId" INTEGER NOT NULL,
    "limitOverride" INTEGER,

    CONSTRAINT "SubscriptionRequestAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionRequest_orgId_idx" ON "SubscriptionRequest"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequestAddOn_subscriptionRequestId_addOnId_key" ON "SubscriptionRequestAddOn"("subscriptionRequestId", "addOnId");

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequestAddOn" ADD CONSTRAINT "SubscriptionRequestAddOn_subscriptionRequestId_fkey" FOREIGN KEY ("subscriptionRequestId") REFERENCES "SubscriptionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequestAddOn" ADD CONSTRAINT "SubscriptionRequestAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
