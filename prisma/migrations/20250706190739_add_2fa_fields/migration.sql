-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "enable_totp_auth" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_secret" TEXT;
