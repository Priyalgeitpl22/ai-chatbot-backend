/*
  Warnings:

  - You are about to drop the column `socialProfiles` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Thread` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "socialProfiles",
DROP COLUMN "url",
ADD COLUMN     "pageTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pageUrl" TEXT NOT NULL DEFAULT '';
