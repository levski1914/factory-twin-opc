CREATE TABLE "EquipmentSample" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "sampledAt" TIMESTAMP(3) NOT NULL,
  "severity" TEXT NOT NULL,
  "hasBadData" BOOLEAN NOT NULL,
  "payload" JSONB NOT NULL,
  CONSTRAINT "EquipmentSample_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EquipmentSample_assetId_sampledAt_key" ON "EquipmentSample"("assetId", "sampledAt");
CREATE INDEX "EquipmentSample_companyId_assetId_sampledAt_idx" ON "EquipmentSample"("companyId", "assetId", "sampledAt");
