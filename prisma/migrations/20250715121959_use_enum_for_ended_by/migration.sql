/*
  Warnings:

  - The `endedBy` column on the `Thread` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EndedByType" AS ENUM ('user', 'bot');

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "endedBy",
ADD COLUMN     "endedBy" "EndedByType";
