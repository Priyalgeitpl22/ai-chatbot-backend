/*
  Warnings:

  - The `status` column on the `AddOnRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AddOnRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "AddOnRequest" DROP COLUMN "status",
ADD COLUMN     "status" "AddOnRequestStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "AddOnRequest_status_idx" ON "AddOnRequest"("status");
