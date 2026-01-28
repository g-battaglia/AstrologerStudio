-- CreateTable
CREATE TABLE "PDFExportUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDFExportUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PDFExportUsage_userId_idx" ON "PDFExportUsage"("userId");

-- CreateIndex
CREATE INDEX "PDFExportUsage_chartType_idx" ON "PDFExportUsage"("chartType");

-- CreateIndex
CREATE INDEX "PDFExportUsage_date_idx" ON "PDFExportUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PDFExportUsage_userId_date_chartType_key" ON "PDFExportUsage"("userId", "date", "chartType");
