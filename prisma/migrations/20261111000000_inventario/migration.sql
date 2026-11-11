CREATE TABLE "InventarioItem" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "unidad" TEXT NOT NULL DEFAULT 'UNIDAD',
  "existencias" INTEGER NOT NULL DEFAULT 0,
  "umbralBajo" INTEGER NOT NULL DEFAULT 1,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventarioItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventarioItem_nombre_key" ON "InventarioItem"("nombre");
CREATE TABLE "InventarioSolicitud" (
  "id" SERIAL NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'CONFIRMADA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "solicitanteId" INTEGER NOT NULL,
  CONSTRAINT "InventarioSolicitud_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventarioSolicitudLinea" (
  "id" SERIAL NOT NULL,
  "solicitudId" INTEGER NOT NULL,
  "itemId" INTEGER NOT NULL,
  "cantidad" INTEGER NOT NULL,
  CONSTRAINT "InventarioSolicitudLinea_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventarioSolicitudLinea_itemId_idx" ON "InventarioSolicitudLinea"("itemId");
ALTER TABLE "InventarioSolicitud" ADD CONSTRAINT "InventarioSolicitud_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventarioSolicitudLinea" ADD CONSTRAINT "InventarioSolicitudLinea_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "InventarioSolicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventarioSolicitudLinea" ADD CONSTRAINT "InventarioSolicitudLinea_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventarioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
