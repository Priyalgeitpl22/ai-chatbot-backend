/*
  Warnings:

  - You are about to drop the column `enable_2fa` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `temp_2fa_secret` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `two_fa_secret` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "enable_2fa",
DROP COLUMN "temp_2fa_secret",
DROP COLUMN "two_fa_secret";
