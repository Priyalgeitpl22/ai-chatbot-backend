/*
  Warnings:

  - You are about to drop the `SubscriptionCancelRequestAddOn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionRequestAddOn` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubscriptionCancelRequestAddOn" DROP CONSTRAINT "SubscriptionCancelRequestAddOn_addOnId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionCancelRequestAddOn" DROP CONSTRAINT "SubscriptionCancelRequestAddOn_subscriptionCancelRequestId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionRequestAddOn" DROP CONSTRAINT "SubscriptionRequestAddOn_addOnId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionRequestAddOn" DROP CONSTRAINT "SubscriptionRequestAddOn_subscriptionRequestId_fkey";

-- DropTable
DROP TABLE "SubscriptionCancelRequestAddOn";

-- DropTable
DROP TABLE "SubscriptionRequestAddOn";

-- CreateTable
CREATE TABLE "AddOnRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "addOnId" INTEGER NOT NULL,
    "requestedById" TEXT,
    "requesteeName" TEXT NOT NULL,
    "requesteeEmail" TEXT NOT NULL,
    "requesteePhone" TEXT,
    "requesteeAddress" TEXT,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "limitOverride" INTEGER,
    "totalCost" DECIMAL(65,30),
    "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddOnRequest_orgId_idx" ON "AddOnRequest"("orgId");

-- CreateIndex
CREATE INDEX "AddOnRequest_addOnId_idx" ON "AddOnRequest"("addOnId");

-- CreateIndex
CREATE INDEX "AddOnRequest_status_idx" ON "AddOnRequest"("status");

-- AddForeignKey
ALTER TABLE "AddOnRequest" ADD CONSTRAINT "AddOnRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnRequest" ADD CONSTRAINT "AddOnRequest_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnRequest" ADD CONSTRAINT "AddOnRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
