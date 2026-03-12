/*
  Warnings:

  - You are about to drop the `ApiData` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AddOnCode" AS ENUM ('EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "ApiData" DROP CONSTRAINT "ApiData_orgId_fkey";

-- DropForeignKey
ALTER TABLE "DynamicData" DROP CONSTRAINT "DynamicData_orgId_fkey";

-- AlterTable
ALTER TABLE "DynamicData" ALTER COLUMN "prompt" DROP NOT NULL,
ALTER COLUMN "apiCurl" DROP NOT NULL,
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(6),
ALTER COLUMN "updatedAt" DROP NOT NULL,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(6);

-- DropTable
DROP TABLE "ApiData";

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(65,30),
    "priceYearly" DECIMAL(65,30),
    "isContactSales" BOOLEAN NOT NULL DEFAULT false,
    "maxUsers" INTEGER,
    "maxSenderAccounts" INTEGER,
    "maxLeadsPerMonth" INTEGER,
    "maxEmailsPerMonth" INTEGER,
    "maxCampaigns" INTEGER,
    "hasEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "hasEmailWarmup" BOOLEAN NOT NULL DEFAULT true,
    "hasUnifiedInbox" BOOLEAN NOT NULL DEFAULT false,
    "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasCustomDomain" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" SERIAL NOT NULL,
    "code" "AddOnCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(65,30),
    "priceYearly" DECIMAL(65,30),
    "emailVerificationLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAddOn" (
    "planId" INTEGER NOT NULL,
    "addOnId" INTEGER NOT NULL,

    CONSTRAINT "PlanAddOn_pkey" PRIMARY KEY ("planId","addOnId")
);

-- CreateTable
CREATE TABLE "OrganizationAddOn" (
    "orgId" TEXT NOT NULL,
    "addOnId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "limitOverride" INTEGER,
    "usedThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "periodStartsAt" TIMESTAMP(3),
    "periodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAddOn_pkey" PRIMARY KEY ("orgId","addOnId")
);

-- CreateTable
CREATE TABLE "OrganizationPlan" (
    "id" SERIAL NOT NULL,
    "orgId" TEXT NOT NULL,
    "planId" INTEGER NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "reminder15Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder10Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder5Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder1Sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionReminderLog" (
    "id" SERIAL NOT NULL,
    "orgId" TEXT NOT NULL,
    "orgPlanId" INTEGER NOT NULL,
    "reminderStage" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientEmail" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "SubscriptionReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_code_key" ON "AddOn"("code");

-- CreateIndex
CREATE INDEX "PlanAddOn_planId_idx" ON "PlanAddOn"("planId");

-- CreateIndex
CREATE INDEX "PlanAddOn_addOnId_idx" ON "PlanAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "OrganizationAddOn_orgId_idx" ON "OrganizationAddOn"("orgId");

-- CreateIndex
CREATE INDEX "OrganizationAddOn_addOnId_idx" ON "OrganizationAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "OrganizationPlan_orgId_idx" ON "OrganizationPlan"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPlan_orgId_isActive_key" ON "OrganizationPlan"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "SubscriptionReminderLog_orgId_idx" ON "SubscriptionReminderLog"("orgId");

-- CreateIndex
CREATE INDEX "SubscriptionReminderLog_orgPlanId_idx" ON "SubscriptionReminderLog"("orgPlanId");

-- AddForeignKey
ALTER TABLE "DynamicData" ADD CONSTRAINT "DynamicData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PlanAddOn" ADD CONSTRAINT "PlanAddOn_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAddOn" ADD CONSTRAINT "PlanAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAddOn" ADD CONSTRAINT "OrganizationAddOn_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAddOn" ADD CONSTRAINT "OrganizationAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPlan" ADD CONSTRAINT "OrganizationPlan_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPlan" ADD CONSTRAINT "OrganizationPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionReminderLog" ADD CONSTRAINT "SubscriptionReminderLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
