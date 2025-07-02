/*
  Warnings:

  - Added the required column `schedule` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "schedule" JSONB NOT NULL;
