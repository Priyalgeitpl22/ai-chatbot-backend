-- AlterTable
ALTER TABLE "User" ADD COLUMN     "enable_2fa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temp_2fa_secret" TEXT,
ADD COLUMN     "two_fa_secret" TEXT;
