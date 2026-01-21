-- CreateTable
CREATE TABLE "ChartCalculationUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartCalculationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChartCalculationUsage_userId_idx" ON "ChartCalculationUsage"("userId");

-- CreateIndex
CREATE INDEX "ChartCalculationUsage_chartType_idx" ON "ChartCalculationUsage"("chartType");

-- CreateIndex
CREATE INDEX "ChartCalculationUsage_date_idx" ON "ChartCalculationUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ChartCalculationUsage_userId_date_chartType_key" ON "ChartCalculationUsage"("userId", "date", "chartType");
