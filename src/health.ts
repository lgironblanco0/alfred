import { prisma } from "./db";

export interface ReadinessResult {
  status: 200 | 503;
  body: {
    status: "ready" | "unavailable";
    checks: { database: "ok" | "error" };
  };
}

/** Comprobación mínima de que la base acepta una consulta. */
export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

/**
 * Readiness: ¿puede la API atender tráfico?
 *
 * La comprobación es inyectable para poder probar el camino de fallo sin
 * tumbar la base de pruebas.
 */
export async function getReadiness(
  check: () => Promise<unknown> = pingDatabase,
): Promise<ReadinessResult> {
  try {
    await check();
    return { status: 200, body: { status: "ready", checks: { database: "ok" } } };
  } catch {
    return { status: 503, body: { status: "unavailable", checks: { database: "error" } } };
  }
}
