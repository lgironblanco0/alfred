import { createTempDatabase, prepareDatabase, runNode } from "./temp-db.mjs";

/**
 * Ejecuta las pruebas con `node:test` contra una base SQLite desechable.
 * Ver docs/PRUEBAS-AISLADAS.md.
 */

const database = createTempDatabase();
const env = database.env();
let failed = false;

try {
  console.log(`Base de pruebas: ${database.databaseUrl}`);
  prepareDatabase("pruebas", env);
  runNode("pruebas", ["node_modules/tsx/dist/cli.mjs", "--test", "tests/**/*.test.ts"], env);
} catch (error) {
  failed = true;
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
} finally {
  database.cleanup();
}

process.exitCode = failed ? 1 : 0;
