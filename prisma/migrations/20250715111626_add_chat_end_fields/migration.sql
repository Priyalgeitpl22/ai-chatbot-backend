-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "endedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
