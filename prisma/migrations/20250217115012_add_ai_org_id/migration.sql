/*
  Warnings:

  - Added the required column `aiOrgId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "aiOrgId" INTEGER NOT NULL,
ALTER COLUMN "orgId" DROP NOT NULL;
