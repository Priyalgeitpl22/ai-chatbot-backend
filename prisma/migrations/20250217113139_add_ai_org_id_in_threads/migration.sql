/*
  Warnings:

  - Added the required column `aiOrgId` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "aiOrgId" INTEGER NOT NULL;
