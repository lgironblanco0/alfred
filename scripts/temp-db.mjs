import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Utilidades compartidas por las pruebas de integración y las E2E.
 * Crean una base SQLite temporal fuera del repositorio y la borran al terminar.
 */

export function createTempDatabase() {
  const tempDir = mkdtempSync(join(tmpdir(), "alfred-test-"));
  const databaseUrl = `file:${join(tempDir, "test.db").replace(/\\/g, "/")}`;

  return {
    tempDir,
    databaseUrl,
    env(extra = {}) {
      return {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: databaseUrl,
        LOG_LEVEL: "silent",
        ...extra,
      };
    },
    cleanup() {
      if (process.env.ALFRED_TEST_KEEP_DB === "1") {
        console.log(`\nBase de pruebas conservada en: ${tempDir}`);
        console.log(`DATABASE_URL=${databaseUrl}`);
        return;
      }
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function runNode(label, args, env) {
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

export function prepareDatabase(label, env) {
  runNode(`${label}: migrate deploy`, [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "prisma/schema.prisma",
  ], env);

  runNode(`${label}: db seed`, ["node_modules/prisma/build/index.js", "db", "seed"], env);
}
