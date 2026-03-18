/*
  Warnings:

  - The primary key for the `SubscriptionCancelRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `approvedById` on the `SubscriptionCancelRequest` table. All the data in the column will be lost.
  - You are about to drop the column `orgPlanId` on the `SubscriptionCancelRequest` table. All the data in the column will be lost.
  - Added the required column `planId` to the `SubscriptionCancelRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requesteeEmail` to the `SubscriptionCancelRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requesteeName` to the `SubscriptionCancelRequest` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `SubscriptionCancelRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "SubscriptionCancelRequest" DROP CONSTRAINT "SubscriptionCancelRequest_orgPlanId_fkey";

-- DropIndex
DROP INDEX "SubscriptionCancelRequest_orgPlanId_idx";

-- AlterTable
ALTER TABLE "SubscriptionCancelRequest" DROP CONSTRAINT "SubscriptionCancelRequest_pkey",
DROP COLUMN "approvedById",
DROP COLUMN "orgPlanId",
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "organizationPlanId" INTEGER,
ADD COLUMN     "planId" INTEGER NOT NULL,
ADD COLUMN     "requesteeAddress" TEXT,
ADD COLUMN     "requesteeEmail" TEXT NOT NULL,
ADD COLUMN     "requesteeName" TEXT NOT NULL,
ADD COLUMN     "requesteePhone" TEXT,
ADD COLUMN     "totalCost" DECIMAL(65,30),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "SubscriptionCancelRequest_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "SubscriptionCancelRequestAddOn" (
    "id" UUID NOT NULL,
    "subscriptionCancelRequestId" UUID NOT NULL,
    "addOnId" INTEGER NOT NULL,
    "limitOverride" INTEGER,

    CONSTRAINT "SubscriptionCancelRequestAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequestAddOn_subscriptionCancelRequestId_idx" ON "SubscriptionCancelRequestAddOn"("subscriptionCancelRequestId");

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequestAddOn_addOnId_idx" ON "SubscriptionCancelRequestAddOn"("addOnId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionCancelRequestAddOn_subscriptionCancelRequestId__key" ON "SubscriptionCancelRequestAddOn"("subscriptionCancelRequestId", "addOnId");

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequest_planId_idx" ON "SubscriptionCancelRequest"("planId");

-- CreateIndex
CREATE INDEX "SubscriptionCancelRequest_requestedById_idx" ON "SubscriptionCancelRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequest" ADD CONSTRAINT "SubscriptionCancelRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequest" ADD CONSTRAINT "SubscriptionCancelRequest_organizationPlanId_fkey" FOREIGN KEY ("organizationPlanId") REFERENCES "OrganizationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequestAddOn" ADD CONSTRAINT "SubscriptionCancelRequestAddOn_subscriptionCancelRequestId_fkey" FOREIGN KEY ("subscriptionCancelRequestId") REFERENCES "SubscriptionCancelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancelRequestAddOn" ADD CONSTRAINT "SubscriptionCancelRequestAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
