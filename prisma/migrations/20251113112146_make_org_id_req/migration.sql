/*
  Warnings:

  - Made the column `orgId` on table `DynamicData` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DynamicData" DROP CONSTRAINT "DynamicData_orgId_fkey";

-- AlterTable
ALTER TABLE "DynamicData" ALTER COLUMN "orgId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "DynamicData" ADD CONSTRAINT "DynamicData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
