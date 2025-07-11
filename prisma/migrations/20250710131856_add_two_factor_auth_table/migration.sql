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

-- CreateTable
CREATE TABLE "TwoFactorAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticatorAppAdded" BOOLEAN NOT NULL DEFAULT false,
    "secret" TEXT,
    "tempSecret" TEXT,
    "enabledAt" TIMESTAMP(3),
    "authenticatorAppAddedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "backupCodes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
