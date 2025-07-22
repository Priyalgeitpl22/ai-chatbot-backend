/*
  Warnings:

  - Added the required column `fileName` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileURl` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileType" TEXT NOT NULL,
ADD COLUMN     "fileURl" TEXT NOT NULL;
