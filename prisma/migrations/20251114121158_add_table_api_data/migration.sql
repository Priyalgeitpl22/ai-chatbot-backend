-- CreateTable
CREATE TABLE "ApiData" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "apiCurl" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApiData" ADD CONSTRAINT "ApiData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
