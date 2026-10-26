-- Reconciliación del salón
-- Aditiva para Mesa; reconstrucción segura de Producto (0 filas).

-- 1. Mesa: orden visual sin recrear la tabla.
ALTER TABLE "Mesa" ADD COLUMN "layoutOrder" INTEGER NOT NULL DEFAULT 0;
UPDATE "Mesa" SET "layoutOrder" = "numeroMesa";

-- 2. Producto: categoria obligatoria, sin valor por defecto.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "destino" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "categoria" TEXT NOT NULL
);
INSERT INTO "new_Producto" ("id", "nombre", "precio", "destino", "activo")
SELECT "id", "nombre", "precio", "destino", "activo" FROM "Producto";
DROP TABLE "Producto";
ALTER TABLE "new_Producto" RENAME TO "Producto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- 3. Servicio
CREATE TABLE "Servicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "pax" INTEGER NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'WALK_IN',
    "modoAsientos" TEXT NOT NULL DEFAULT 'POR_ASIENTO',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "descuentoCodigo" TEXT,
    "descuentoTipo" TEXT,
    "descuentoValor" INTEGER,
    "splitModo" TEXT NOT NULL DEFAULT 'NINGUNO'
);

-- 4. ServicioMesa
CREATE TABLE "ServicioMesa" (
    "servicioId" INTEGER NOT NULL,
    "mesaId" INTEGER NOT NULL,

    PRIMARY KEY ("servicioId", "mesaId"),
    CONSTRAINT "ServicioMesa_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicioMesa_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 5. LineaPedido
CREATE TABLE "LineaPedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "mesaId" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "numeroAsiento" INTEGER,
    "esCompartido" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivoAnulacion" TEXT,
    "notas" TEXT,
    "precioUnitario" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" DATETIME,
    CONSTRAINT "LineaPedido_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LineaPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LineaPedido_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 6. PromoCodigo (compatibilidad; promociones aplazadas)
CREATE TABLE "PromoCodigo" (
    "codigo" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- 7. EventoServicio
CREATE TABLE "EventoServicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
