import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Ejecuta las pruebas contra una base SQLite desechable.
 *
 * 1. Crea una carpeta temporal fuera del repositorio.
 * 2. Aplica todas las migraciones y siembra los datos de demostración.
 * 3. Lanza `tsx --test` con DATABASE_URL apuntando a esa base.
 * 4. Borra la carpeta, también si las pruebas fallan.
 */

const keepDb = process.env.ALFRED_TEST_KEEP_DB === "1";
const tempDir = mkdtempSync(join(tmpdir(), "alfred-test-"));
const databaseUrl = `file:${join(tempDir, "test.db").replace(/\\/g, "/")}`;

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
  LOG_LEVEL: "silent",
};

function run(label, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} terminó con código ${result.status ?? "desconocido"}`);
  }
}

let failed = false;

try {
  console.log(`Base de pruebas: ${databaseUrl}`);

  run("prisma migrate deploy", [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "prisma/schema.prisma",
  ]);

  run("prisma db seed", [
    "node_modules/prisma/build/index.js",
    "db",
    "seed",
  ]);

  run("pruebas", ["node_modules/tsx/dist/cli.mjs", "--test", "tests/**/*.test.ts"]);
} catch (error) {
  failed = true;
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (keepDb) {
    console.log(`\nBase de pruebas conservada en: ${tempDir}`);
    console.log(`DATABASE_URL=${databaseUrl}`);
  } else {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

process.exitCode = failed ? 1 : 0;
