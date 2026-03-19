/*
  Warnings:

  - You are about to drop the column `dynamicDataUsed` on the `OrganizationPlan` table. All the data in the column will be lost.
  - You are about to drop the column `chatHistoryLimit` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasAnalytics` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasPrioritySupport` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxDynamicData` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrganizationPlan" DROP COLUMN "dynamicDataUsed";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "chatHistoryLimit",
DROP COLUMN "hasAnalytics",
DROP COLUMN "hasPrioritySupport",
DROP COLUMN "maxDynamicData";
