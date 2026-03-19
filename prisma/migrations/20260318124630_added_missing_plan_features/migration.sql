-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "hasRealtimeApiData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSupportTickets" BOOLEAN NOT NULL DEFAULT false;
