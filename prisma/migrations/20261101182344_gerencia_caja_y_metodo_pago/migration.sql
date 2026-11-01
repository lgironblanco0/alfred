-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN "metodoPago" TEXT;

-- CreateTable
CREATE TABLE "SesionCaja" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "fondoInicial" INTEGER NOT NULL DEFAULT 0,
    "abiertaAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abiertaPorId" INTEGER,
    "cerradaAt" DATETIME,
    "cerradaPorId" INTEGER,
    "efectivoEsperado" INTEGER,
    "efectivoContado" INTEGER,
    "diferencia" INTEGER,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesionCaja_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SesionCaja_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SesionCaja_estado_idx" ON "SesionCaja"("estado");

-- CreateIndex
CREATE INDEX "SesionCaja_abiertaAt_idx" ON "SesionCaja"("abiertaAt");
