-- Código individual por empleado.
-- La columna es obligatoria y única. Para no perder las filas existentes,
-- se reconstruye la tabla y el código se deriva del email actual (0@..., 1@...).

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'CAMARERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Usuario" ("codigo", "activo", "createdAt", "email", "id", "nombre", "passwordHash", "rol")
SELECT substr("email", 1, instr("email", '@') - 1), "activo", "createdAt", "email", "id", "nombre", "passwordHash", "rol"
FROM "Usuario";

DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";

CREATE UNIQUE INDEX "Usuario_codigo_key" ON "Usuario"("codigo");
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
