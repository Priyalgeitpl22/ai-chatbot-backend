-- DropForeignKey
ALTER TABLE "DynamicData" DROP CONSTRAINT "DynamicData_orgId_fkey";

-- AlterTable
ALTER TABLE "DynamicData" ALTER COLUMN "orgId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "DynamicData" ADD CONSTRAINT "DynamicData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
