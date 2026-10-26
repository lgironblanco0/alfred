-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroMesa" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CUADRADA',
    "zona" TEXT NOT NULL DEFAULT 'RESTAURANTE',
    "clase" TEXT NOT NULL DEFAULT 'MESA'
);
INSERT INTO "new_Mesa" ("capacidad", "id", "numeroMesa", "tipo") SELECT "capacidad", "id", "numeroMesa", "tipo" FROM "Mesa";
DROP TABLE "Mesa";
ALTER TABLE "new_Mesa" RENAME TO "Mesa";
CREATE UNIQUE INDEX "Mesa_zona_clase_numeroMesa_key" ON "Mesa"("zona", "clase", "numeroMesa");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
