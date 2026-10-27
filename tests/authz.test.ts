import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { authHeaders, login } from "./helpers/auth.js";

process.env.LOG_LEVEL = "silent";

let server: Server;
let baseUrl: string;
let tokenCamarero: string;

interface Escritura {
  nombre: string;
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Cuerpos seguros: usan identificadores inexistentes para que, mientras la ruta
 * siga abierta, la prueba no escriba nada en la base de demostración.
 */
const escrituras: Escritura[] = [
  { nombre: "abrir mesa", method: "POST", path: "/api/servicios", body: { mesaId: 999_999, pax: 2 } },
  { nombre: "ampliar pax", method: "PATCH", path: "/api/servicios/999999/pax", body: { pax: 2 } },
  { nombre: "unir mesas", method: "POST", path: "/api/servicios/999999/merge", body: { mesaIds: [] } },
  { nombre: "cancelar servicio", method: "POST", path: "/api/servicios/999999/cancel", body: { motivo: "prueba" } },
  { nombre: "añadir línea", method: "POST", path: "/api/servicios/999999/items", body: { productoId: 1 } },
  { nombre: "llamar líneas", method: "POST", path: "/api/servicios/999999/call", body: {} },
  { nombre: "aplicar promo", method: "POST", path: "/api/servicios/999999/promo", body: { codigo: "PRUEBA" } },
  { nombre: "dividir cuenta", method: "POST", path: "/api/servicios/999999/split", body: { splitModo: "IGUAL" } },
  { nombre: "cobrar", method: "POST", path: "/api/servicios/999999/pagar", body: {} },
  { nombre: "marcar listo", method: "POST", path: "/api/lineas/999999/ready", body: {} },
  { nombre: "anular línea", method: "POST", path: "/api/lineas/999999/anular", body: { motivo: "prueba" } },
  { nombre: "reordenar mesas", method: "PATCH", path: "/api/mesas/layout", body: { items: [] } },
];

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
  tokenCamarero = await login(baseUrl, "2");
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const { prisma } = await import("../src/db.js");
  await prisma.$disconnect();
});

async function call(escritura: Escritura, headers: Record<string, string>) {
  return fetch(`${baseUrl}${escritura.path}`, {
    method: escritura.method,
    headers,
    ...(escritura.method === "GET" ? {} : { body: JSON.stringify(escritura.body ?? {}) }),
  });
}

describe("rutas de escritura sin token", () => {
  for (const escritura of escrituras) {
    it(`rechaza ${escritura.nombre} sin token`, async () => {
      const response = await call(escritura, { "Content-Type": "application/json" });
      const payload = (await response.json()) as { code: string; message: string };

      assert.equal(response.status, 401, `${escritura.method} ${escritura.path} debe exigir identidad`);
      assert.equal(payload.code, "UNAUTHORIZED");
      assert.ok(payload.message.length > 0);
    });
  }

  it("rechaza un token manipulado con INVALID_TOKEN", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: authHeaders(`${tokenCamarero}x`),
      body: JSON.stringify({ mesaId: 999_999, pax: 2 }),
    });

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_TOKEN");
  });

  it("devuelve 401 antes de validar el cuerpo", async () => {
    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "UNAUTHORIZED");
  });
});

describe("permisos por rol", () => {
  it("impide a un camarero cobrar", async () => {
    const response = await call(escrituras.find((item) => item.nombre === "cobrar")!, authHeaders(tokenCamarero));

    assert.equal(response.status, 403);
    assert.equal(((await response.json()) as { code: string }).code, "FORBIDDEN");
  });

  it("impide a un camarero gestionar usuarios", async () => {
    const response = await fetch(`${baseUrl}/api/usuarios`, { headers: authHeaders(tokenCamarero) });

    assert.equal(response.status, 403);
    assert.equal(((await response.json()) as { code: string }).code, "FORBIDDEN");
  });

  it("deja que un camarero alcance la lógica de negocio", async (t) => {
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
      headers: authHeaders(tokenCamarero),
      body: JSON.stringify({ mesaId: ocupada.id, pax: 2 }),
    });

    assert.equal(response.status, 409, "debe llegar al servicio y chocar con la mesa ocupada, no fallar por permisos");
    assert.equal(((await response.json()) as { code: string }).code, "CONFLICT");
  });
});

describe("rutas que siguen abiertas", () => {
  it("permite iniciar sesión sin token", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: "999" }),
    });

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_CREDENTIALS");
  });

  it("mantiene GET /api/sala público (decisión D-5)", async () => {
    const response = await fetch(`${baseUrl}/api/sala`);

    assert.equal(response.status, 200);
    const payload = (await response.json()) as { mesas: unknown[] };
    assert.ok(payload.mesas.length > 0);
  });
});
