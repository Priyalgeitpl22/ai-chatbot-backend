-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aiOrgId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT true;
