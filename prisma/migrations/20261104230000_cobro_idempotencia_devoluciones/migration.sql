-- AlterTable
ALTER TABLE "Pago" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pago_servicioId_idempotencyKey_key" ON "Pago"("servicioId", "idempotencyKey");

