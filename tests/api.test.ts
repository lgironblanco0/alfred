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

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

async function readError(response: Response): Promise<ErrorPayload> {
  const payload = (await response.json()) as ErrorPayload;

  assert.ok(payload, "la respuesta debe ser JSON");
  assert.equal(typeof payload.code, "string");
  assert.match(payload.code, CODE_PATTERN);
  assert.equal(typeof payload.message, "string");
  assert.ok(payload.message.length > 0);
  assert.notEqual(payload.details, null);

  return payload;
}

function detailsOf(payload: ErrorPayload): Array<{ path: string; message: string }> {
  assert.ok(Array.isArray(payload.details), "details debe ser un array");
  return payload.details as Array<{ path: string; message: string }>;
}

describe("contrato de errores de borde", () => {
  it("devuelve 415 ante un charset no soportado", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=iso-8859-1" },
      body: JSON.stringify({ pax: 2 }),
    });

    assert.equal(response.status, 415);
    assert.equal((await readError(response)).code, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("rechaza pax enviado como texto", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId: 999_999, pax: "2" }),
    });

    const payload = await readError(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(detailsOf(payload).some((issue) => issue.path === "pax"));
  });

  it("no convierte un booleano en un pax válido", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId: 999_999, pax: true }),
    });

    const payload = await readError(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(detailsOf(payload).some((issue) => issue.path === "pax"));
  });

  it("señala el cuerpo completo cuando no es un objeto", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });

    const payload = await readError(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(detailsOf(payload).some((issue) => issue.path === "body"));
  });

  it("exige mesa o creación de mesa en el borde", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pax: 2 }),
    });

    const payload = await readError(response);

    assert.equal(response.status, 400);
    assert.equal(payload.code, "VALIDATION_ERROR");
    assert.ok(detailsOf(payload).some((issue) => issue.path === "mesaId"));
  });
});

describe("contrato de errores de negocio", () => {
  it("devuelve 404 al ampliar un servicio inexistente", async () => {
    const response = await fetch(`${baseUrl}/api/servicios/999999/pax`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pax: 3 }),
    });

    assert.equal(response.status, 404);
    assert.equal((await readError(response)).code, "NOT_FOUND");
  });

  it("devuelve 404 al abrir una mesa inexistente", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId: 999_999, pax: 2 }),
    });

    assert.equal(response.status, 404);
    assert.equal((await readError(response)).code, "NOT_FOUND");
  });

  it("devuelve 409 al abrir una mesa ya ocupada", async (t) => {
    const sala = (await (await fetch(`${baseUrl}/api/sala`)).json()) as {
      mesas: Array<{ id: number; servicio: { id: number } | null }>;
    };
    const ocupada = sala.mesas.find((mesa) => mesa.servicio);

    if (!ocupada) {
      t.skip("La base de demostración no tiene mesas ocupadas (prueba determinista en 2.1)");
      return;
    }

    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mesaId: ocupada.id, pax: 2 }),
    });

    assert.equal(response.status, 409);
    assert.equal((await readError(response)).code, "CONFLICT");
  });
});
