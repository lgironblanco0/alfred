-- CreateTable
CREATE TABLE "Pago" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "importe" INTEGER NOT NULL,
    "propina" INTEGER NOT NULL DEFAULT 0,
    "recibido" INTEGER,
    "cambio" INTEGER,
    "concepto" TEXT,
    "actorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pago_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pago_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Pago_servicioId_idx" ON "Pago"("servicioId");

-- CreateIndex
CREATE INDEX "Pago_actorId_idx" ON "Pago"("actorId");
