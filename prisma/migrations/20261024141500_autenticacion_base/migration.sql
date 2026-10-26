-- Base de autenticación
-- Renombrado de contraseña y auditoría por usuario.

-- 1. Usuario: password -> passwordHash sin recrear la tabla.
ALTER TABLE "Usuario" RENAME COLUMN "password" TO "passwordHash";

-- 2. EventoServicio: reconstrucción para conservar la clave foránea nombrada
--    que espera Prisma. La tabla tiene pocas filas y ninguna tabla la referencia.
CREATE TABLE "new_EventoServicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "actorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventoServicio_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventoServicio" ("id", "servicioId", "tipo", "detalle", "createdAt")
SELECT "id", "servicioId", "tipo", "detalle", "createdAt" FROM "EventoServicio";
DROP TABLE "EventoServicio";
ALTER TABLE "new_EventoServicio" RENAME TO "EventoServicio";

-- 3. Índice para consultas por actor.
CREATE INDEX "EventoServicio_actorId_idx" ON "EventoServicio"("actorId");
