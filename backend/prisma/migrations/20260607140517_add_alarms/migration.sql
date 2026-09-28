-- CreateTable
CREATE TABLE "Alarm" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alarm_assetId_idx" ON "Alarm"("assetId");

-- CreateIndex
CREATE INDEX "Alarm_status_idx" ON "Alarm"("status");
