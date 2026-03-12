/*
  Warnings:

  - The values [EMAIL_VERIFICATION] on the enum `AddOnCode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `emailVerificationLimit` on the `AddOn` table. All the data in the column will be lost.
  - You are about to drop the column `hasAdvancedAnalytics` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasCustomDomain` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasEmailVerification` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasEmailWarmup` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `hasUnifiedInbox` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxCampaigns` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxEmailsPerMonth` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxLeadsPerMonth` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxSenderAccounts` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxUsers` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AddOnCode_new" AS ENUM ('EXTRA_USER_SESSIONS');
ALTER TABLE "AddOn" ALTER COLUMN "code" TYPE "AddOnCode_new" USING ("code"::text::"AddOnCode_new");
ALTER TYPE "AddOnCode" RENAME TO "AddOnCode_old";
ALTER TYPE "AddOnCode_new" RENAME TO "AddOnCode";
DROP TYPE "AddOnCode_old";
COMMIT;

-- AlterTable
ALTER TABLE "AddOn" DROP COLUMN "emailVerificationLimit",
ADD COLUMN     "extraUserSessions" INTEGER;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "hasAdvancedAnalytics",
DROP COLUMN "hasCustomDomain",
DROP COLUMN "hasEmailVerification",
DROP COLUMN "hasEmailWarmup",
DROP COLUMN "hasUnifiedInbox",
DROP COLUMN "maxCampaigns",
DROP COLUMN "maxEmailsPerMonth",
DROP COLUMN "maxLeadsPerMonth",
DROP COLUMN "maxSenderAccounts",
DROP COLUMN "maxUsers",
ADD COLUMN     "chatHistoryLimit" INTEGER,
ADD COLUMN     "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasCustomBranding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAgents" INTEGER,
ADD COLUMN     "maxDynamicData" INTEGER,
ADD COLUMN     "maxUserSessions" INTEGER;
