-- CreateTable
CREATE TABLE "Configuration" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "configurationKey" TEXT NOT NULL,
    "configurationValue" JSONB,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_uuid_key" ON "Configuration"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_configurationKey_key" ON "Configuration"("configurationKey");

-- CreateIndex
CREATE INDEX "Configuration_isDeleted_idx" ON "Configuration"("isDeleted");

-- CreateIndex
CREATE INDEX "Configuration_configurationKey_idx" ON "Configuration"("configurationKey");

-- CreateIndex
CREATE INDEX "Configuration_status_idx" ON "Configuration"("status");
