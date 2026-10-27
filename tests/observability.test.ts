import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import type { Request, Response } from "express";

process.env.LOG_LEVEL = "silent";

let server: Server;
let baseUrl: string;

before(async () => {
  const { app } = await import("../src/app.js");

  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("No se pudo obtener el puerto de prueba");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const { prisma } = await import("../src/db.js");
  await prisma.$disconnect();
});

describe("redacción de logs", () => {
  it("oculta claves sensibles en cualquier profundidad", async () => {
    const { sanitizeLogFields } = await import("../src/logger.js");

    const sanitized = sanitizeLogFields({
      password: "ClaveSegura123",
      usuario: { nombre: "Ana", token: "abc", authorization: "Bearer abc" },
      lista: [{ secret: "s", cookie: "c", jwt: "j", normal: "visible" }],
    });

    assert.deepEqual(sanitized, {
      password: "[REDACTED]",
      usuario: { nombre: "Ana", token: "[REDACTED]", authorization: "[REDACTED]" },
      lista: [{ secret: "[REDACTED]", cookie: "[REDACTED]", jwt: "[REDACTED]", normal: "visible" }],
    });
  });

  it("trunca cadenas largas y niveles excesivos", async () => {
    const { sanitizeLogFields } = await import("../src/logger.js");

    const long = sanitizeLogFields({ detalle: "x".repeat(2000) }) as { detalle: string };
    assert.equal(long.detalle.length, 1001);
    assert.ok(long.detalle.endsWith("…"));

    const deep = sanitizeLogFields({ a: { b: { c: { d: { e: "final" } } } } });
    assert.deepEqual(deep, { a: { b: { c: { d: { e: "[TRUNCATED]" } } } } });
  });
});

describe("log de acceso", () => {
  it("incluye petición, estado y duración redondeada", async () => {
    const { requestLogFields } = await import("../src/middleware/requestLogger.js");

    const request = { method: "POST", path: "/api/servicios" } as unknown as Request;
    const response = { locals: { requestId: "req-1" }, statusCode: 201 } as unknown as Response;

    assert.deepEqual(requestLogFields(request, response, 12.3456), {
      requestId: "req-1",
      method: "POST",
      path: "/api/servicios",
      status: 201,
      durationMs: 12.35,
    });
  });

  it("identifica al empleado sin nombre ni email", async () => {
    const { requestLogFields } = await import("../src/middleware/requestLogger.js");

    const request = {
      method: "POST",
      path: "/api/servicios/1/pagar",
      usuario: { id: 5, rol: "CAMARERO", nombre: "Ana Ruiz", email: "ana@alfred.local" },
    } as unknown as Request;
    const response = { locals: { requestId: "req-2" }, statusCode: 403 } as unknown as Response;

    const fields = requestLogFields(request, response, 1);

    assert.equal(fields.userId, 5);
    assert.equal(fields.role, "CAMARERO");
    assert.equal("nombre" in fields, false);
    assert.equal("email" in fields, false);
  });
});

describe("readiness", () => {
  it("responde 200 cuando la base contesta", async () => {
    const { getReadiness } = await import("../src/health.js");

    const result = await getReadiness(async () => undefined);

    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.body).sort(), ["checks", "status"]);
    assert.equal(result.body.status, "ready");
    assert.equal(result.body.checks.database, "ok");
  });

  it("responde 503 sin filtrar el error cuando la base falla", async () => {
    const { getReadiness } = await import("../src/health.js");

    const result = await getReadiness(async () => {
      throw new Error("SQLITE_CANTOPEN: ruta secreta /var/data/dev.db");
    });

    assert.equal(result.status, 503);
    assert.equal(result.body.status, "unavailable");
    assert.equal(result.body.checks.database, "error");
    assert.equal(JSON.stringify(result.body).includes("secreta"), false);
  });

  it("la ruta /ready comprueba la base real", async () => {
    const response = await fetch(`${baseUrl}/ready`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ready",
      checks: { database: "ok" },
    });
  });
});

describe("log de errores", () => {
  it("incluye pila fuera de producción y la omite en producción", async () => {
    const { errorLogFields } = await import("../src/middleware/errorHandler.js");
    const error = new Error("boom");

    const development = errorLogFields(error, true, "req-3");
    assert.equal(development.requestId, "req-3");
    assert.equal(development.error, "boom");
    assert.equal(development.errorName, "Error");
    assert.match(String(development.stack), /boom/);

    const production = errorLogFields(error, false, "req-4");
    assert.equal("stack" in production, false);
    assert.equal(production.errorName, "Error");
  });

  it("no inventa nombre ni pila para un error desconocido", async () => {
    const { errorLogFields } = await import("../src/middleware/errorHandler.js");

    const fields = errorLogFields("algo raro", true, "req-5");

    assert.deepEqual(fields, { requestId: "req-5", error: "Error desconocido" });
  });
});
