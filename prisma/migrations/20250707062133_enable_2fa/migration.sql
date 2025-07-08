/*
  Warnings:

  - You are about to drop the column `is2FAEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `totp_secret` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "is2FAEnabled",
DROP COLUMN "totp_secret",
ADD COLUMN     "enable_2fa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temp_2fa_secret" TEXT,
ADD COLUMN     "two_fa_secret" TEXT;
