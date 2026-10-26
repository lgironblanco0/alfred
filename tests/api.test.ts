import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

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

describe("salud y errores básicos", () => {
  it("responde 200 en /health", async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.ok(response.headers.get("x-request-id"));
  });

  it("respeta un identificador de petición válido", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { "x-request-id": "prueba-123" },
    });

    assert.equal(response.headers.get("x-request-id"), "prueba-123");
  });

  it("devuelve 404 con formato canónico", async () => {
    const response = await fetch(`${baseUrl}/api/no-existe`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      code: "NOT_FOUND",
      message: "Ruta no encontrada",
    });
  });

  it("devuelve 400 ante JSON inválido", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "INVALID_JSON");
  });

  it("devuelve 413 ante un cuerpo demasiado grande", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pax: 1, relleno: "x".repeat(200_000) }),
    });

    assert.equal(response.status, 413);
    assert.equal((await response.json()).code, "PAYLOAD_TOO_LARGE");
  });
});

describe("validación de entrada", () => {
  it("rechaza un walk-in sin pax", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId: 1 }),
    });

    const payload = (await response.json()) as {
      code: string;
      details: Array<{ path: string; message: string }>;
    };

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(payload.details.some((issue) => issue.path === "pax"));
  });

  it("rechaza un identificador de ruta no numérico", async () => {
    const response = await fetch(`${baseUrl}/api/servicios/abc/pax`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pax: 2 }),
    });

    const payload = (await response.json()) as {
      code: string;
      details: Array<{ path: string }>;
    };

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(payload.details.some((issue) => issue.path === "id"));
  });

  it("rechaza un pax no positivo", async () => {
    const response = await fetch(`${baseUrl}/api/servicios/1/pax`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pax: 0 }),
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "VALIDATION_ERROR");
  });

  it("rechaza una anulación sin motivo", async () => {
    const response = await fetch(`${baseUrl}/api/lineas/1/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: "   " }),
    });

    const payload = (await response.json()) as {
      code: string;
      details: Array<{ path: string }>;
    };

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(payload.details.some((issue) => issue.path === "motivo"));
  });

  it("rechaza un layout con orden negativo", async () => {
    const response = await fetch(`${baseUrl}/api/mesas/layout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: 1, layoutOrder: -1 }] }),
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "VALIDATION_ERROR");
  });
});
