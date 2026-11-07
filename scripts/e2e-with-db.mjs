import "dotenv/config";
import { createTempDatabase, prepareDatabase, runNode } from "./temp-db.mjs";

/**
 * Ejecuta Playwright contra un schema PostgreSQL desechable.
 * Playwright arranca la API en 3100 y Vite en 5180 (ver playwright.config.ts).
 * Ver docs/E2E.md.
 */

const database = createTempDatabase();
const env = database.env({
  PORT: "3100",
  ALFRED_API_URL: "http://localhost:3100",
});
let failed = false;

try {
  console.log(`Base de pruebas E2E: ${database.databaseUrl}`);
  prepareDatabase("e2e", env);
  runNode("e2e", ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], env);
} catch (error) {
  failed = true;
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
} finally {
  database.cleanup();
}

process.exitCode = failed ? 1 : 0;
