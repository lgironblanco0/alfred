import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

/**
 * Utilidades compartidas por las pruebas de integración y las E2E.
 * Crean un schema PostgreSQL temporal y lo borran al terminar.
 */

export function createTempDatabase() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl || !baseUrl.startsWith("postgres")) throw new Error("Las pruebas necesitan DATABASE_URL PostgreSQL en .env");
  const schema = `alfred_test_${randomBytes(6).toString("hex")}`;
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  const databaseUrl = url.toString();

  return {
    databaseUrl,
    schema,
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
      if (process.env.ALFRED_TEST_KEEP_DB === "1") return;
      runNode("limpieza del schema de pruebas", ["scripts/drop-test-schema.mjs", schema], { ...process.env, DATABASE_URL: baseUrl });
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
