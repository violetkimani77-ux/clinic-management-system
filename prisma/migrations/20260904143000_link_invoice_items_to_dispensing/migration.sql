ALTER TABLE "InvoiceItem"
ADD COLUMN "dispensingId" TEXT;

CREATE UNIQUE INDEX "InvoiceItem_dispensingId_key" ON "InvoiceItem"("dispensingId");

ALTER TABLE "InvoiceItem"
ADD CONSTRAINT "InvoiceItem_dispensingId_fkey"
FOREIGN KEY ("dispensingId") REFERENCES "Dispensing"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
