-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activationToken" TEXT,
ADD COLUMN     "activationTokenExpires" TIMESTAMP(3);
