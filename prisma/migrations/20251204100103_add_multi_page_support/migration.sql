-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "completedPages" INTEGER DEFAULT 0,
ADD COLUMN     "pageUrl" TEXT,
ADD COLUMN     "parentScanId" TEXT,
ADD COLUMN     "totalPages" INTEGER;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_parentScanId_fkey" FOREIGN KEY ("parentScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
