-- AlterTable
ALTER TABLE "ChatConfig" ADD COLUMN     "addInitialPopupText" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);
