-- AlterTable
ALTER TABLE "FAQ" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "uploadedAt" TIMESTAMP(3),
ADD COLUMN     "uploadedBy" TEXT;
