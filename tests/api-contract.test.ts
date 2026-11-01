import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { authHeaders, login } from "./helpers/auth.js";

process.env.LOG_LEVEL = "silent";

/**
 * Pruebas de contrato del Bloque 2.3.
 *
 * No simulan controladores: arrancan la API real contra la base temporal del
 * runner y fijan el conjunto exacto de claves de las respuestas. Si el backend
 * añade o quita un campo, estas pruebas fallan y obligan a actualizar
 * `docs/API.md` en el mismo commit.
 */

const USER_KEYS = ["activo", "codigo", "email", "id", "nombre", "rol"];
const USUARIO_LIST_KEYS = ["activo", "codigo", "createdAt", "email", "id", "nombre", "rol"];
const MESA_KEYS = ["capacidad", "clase", "id", "label", "layoutOrder", "numeroMesa", "servicio", "tipo", "zona"];
const PRODUCTO_KEYS = ["categoria", "destino", "id", "nombre", "precio"];
const SERVICIO_KEYS = [
  "closedAt",
  "descuentoCodigo",
  "descuentoTipo",
  "descuentoValor",
  "discount",
  "estado",
  "eventos",
  "id",
  "lineas",
  "mesaIds",
  "mesaLabels",
  "metodoPago",
  "openedAt",
  "origen",
  "pax",
  "splitModo",
  "subtotal",
  "total",
];
const LINEA_KEYS = [
  "calledAt",
  "cantidad",
  "categoria",
  "createdAt",
  "destino",
  "esCompartido",
  "estado",
  "id",
  "motivoAnulacion",
  "nombre",
  "numeroAsiento",
  "precioUnitario",
  "productoId",
];
const EVENTO_KEYS = ["actor", "createdAt", "detalle", "id", "tipo"];
const HISTORICO_KEYS = ["limit", "offset", "servicios", "total"];
const CAJA_KEYS = ["resumen", "sesion"];
const RESUMEN_KEYS = [
  "efectivoEsperado",
  "numeroCobros",
  "totalCobrado",
  "ventasEfectivo",
  "ventasTarjeta",
];

interface Respuesta<T> {
  status: number;
  body: T;
  headers: Headers;
}

let server: Server;
let baseUrl: string;
let tokenCamarero: string;
let tokenGerente: string;
let tokenEncargado: string;
let usuarioCamarero: { id: number; nombre: string };

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
  tokenCamarero = await login(baseUrl, "5");
  tokenGerente = await login(baseUrl, "0");
  tokenEncargado = await login(baseUrl, "1");

  const me = await request<{ usuario: typeof usuarioCamarero }>("/api/auth/me", {
    headers: authHeaders(tokenCamarero),
  });
  usuarioCamarero = me.body.usuario;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const { prisma } = await import("../src/db.js");
  await prisma.$disconnect();
});

async function request<T>(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<Respuesta<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const body = (await response.json()) as T;
  return { status: response.status, body, headers: response.headers };
}

function keys(value: object): string[] {
  return Object.keys(value).sort();
}

function assertError(body: { code: string; message: string }, code: string): void {
  assert.deepEqual(keys(body), ["code", "message"]);
  assert.equal(body.code, code);
  assert.equal(typeof body.message, "string");
  assert.ok(body.message.length > 0);
}

async function abrirServicio(token = tokenCamarero) {
  const response = await request<Record<string, unknown>>("/api/servicios", {
    method: "POST",
    headers: authHeaders(token),
    body: { createTable: true, pax: 2 },
  });

  assert.equal(response.status, 201);
  return response.body as unknown as {
    id: number;
    mesaIds: number[];
    lineas: Array<Record<string, unknown>>;
    eventos: Array<Record<string, unknown>>;
    subtotal: number;
    discount: number;
    total: number;
    estado: string;
    closedAt: string | null;
  };
}

describe("contrato: salud y errores", () => {
  it("health responde con la forma documentada", async () => {
    const response = await request<{ status: string }>("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(keys(response.body), ["status"]);
    assert.equal(response.body.status, "ok");
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  });

  it("una ruta inexistente devuelve 404 NOT_FOUND", async () => {
    const response = await request<{ code: string; message: string }>("/api/no-existe");

    assert.equal(response.status, 404);
    assertError(response.body, "NOT_FOUND");
  });

  it("una entrada inválida devuelve 400 VALIDATION_ERROR con detalles", async () => {
    const response = await request<{
      code: string;
      message: string;
      details: Array<{ path: string; message: string }>;
    }>("/api/servicios", {
      method: "POST",
      headers: authHeaders(tokenCamarero),
      body: {},
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(response.body.details));
    assert.ok(response.body.details.length > 0);
    assert.deepEqual(keys(response.body.details[0]), ["message", "path"]);
  });
});

describe("contrato: sala pública", () => {
  it("GET /api/sala no exige token y fija las claves de mesa y producto", async () => {
    const response = await request<{
      mesas: Array<Record<string, unknown>>;
      productos: Array<Record<string, unknown>>;
      promos: Array<Record<string, unknown>>;
    }>("/api/sala");

    assert.equal(response.status, 200);
    assert.deepEqual(keys(response.body), ["mesas", "productos", "promos"]);
    assert.ok(response.body.mesas.length > 0, "el seed debe dejar mesas");
    assert.ok(response.body.productos.length > 0, "el seed debe dejar productos");

    assert.deepEqual(keys(response.body.mesas[0]), MESA_KEYS);
    assert.deepEqual(keys(response.body.productos[0]), PRODUCTO_KEYS);

    const conServicio = response.body.mesas.find((mesa) => mesa.servicio !== null);
    if (conServicio) {
      assert.deepEqual(keys(conServicio.servicio as object), SERVICIO_KEYS);
    }
  });
});

describe("contrato: autenticación", () => {
  it("login y /me devuelven la misma forma de usuario, sin contraseña", async () => {
    const response = await request<{
      token: string;
      expiresIn: string;
      usuario: Record<string, unknown>;
    }>("/api/auth/login", {
      method: "POST",
      body: { codigo: "5" },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(keys(response.body), ["expiresIn", "token", "usuario"]);
    assert.equal(typeof response.body.token, "string");
    assert.equal(typeof response.body.expiresIn, "string");
    assert.deepEqual(keys(response.body.usuario), USER_KEYS);
    assert.equal("passwordHash" in response.body.usuario, false);

    const me = await request<{ usuario: Record<string, unknown> }>("/api/auth/me", {
      headers: authHeaders(response.body.token),
    });

    assert.equal(me.status, 200);
    assert.deepEqual(keys(me.body), ["usuario"]);
    assert.deepEqual(keys(me.body.usuario), USER_KEYS);
    assert.deepEqual(me.body.usuario, response.body.usuario);
  });

  it("un código inexistente devuelve 401 INVALID_CREDENTIALS", async () => {
    const response = await request<{ code: string; message: string }>("/api/auth/login", {
      method: "POST",
      body: { codigo: `inexistente-${Math.random().toString(36).slice(2, 8)}` },
    });

    assert.equal(response.status, 401);
    assertError(response.body, "INVALID_CREDENTIALS");
  });

  it("/me sin token devuelve 401 UNAUTHORIZED", async () => {
    const response = await request<{ code: string; message: string }>("/api/auth/me");

    assert.equal(response.status, 401);
    assertError(response.body, "UNAUTHORIZED");
  });
});

describe("contrato: empleados solo para gerencia", () => {
  it("sin token devuelve 401 y un camarero recibe 403", async () => {
    const sinToken = await request<{ code: string; message: string }>("/api/usuarios");
    assert.equal(sinToken.status, 401);
    assertError(sinToken.body, "UNAUTHORIZED");

    const camarero = await request<{ code: string; message: string }>("/api/usuarios", {
      headers: authHeaders(tokenCamarero),
    });
    assert.equal(camarero.status, 403);
    assertError(camarero.body, "FORBIDDEN");
  });

  it("un gerente ve la lista con la forma documentada", async () => {
    const response = await request<{ usuarios: Array<Record<string, unknown>> }>("/api/usuarios", {
      headers: authHeaders(tokenGerente),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(keys(response.body), ["usuarios"]);
    assert.ok(response.body.usuarios.length > 0);
    assert.deepEqual(keys(response.body.usuarios[0]), USUARIO_LIST_KEYS);
    assert.equal("passwordHash" in response.body.usuarios[0], false);
  });
});

describe("contrato: histórico y caja", () => {
  it("un encargado ve la forma documentada y un camarero recibe 403", async () => {
    const historico = await request<Record<string, unknown>>("/api/historico", {
      headers: authHeaders(tokenEncargado),
    });
    assert.equal(historico.status, 200);
    assert.deepEqual(keys(historico.body), HISTORICO_KEYS);

    const caja = await request<{ resumen: Record<string, unknown>; sesion: unknown }>("/api/caja", {
      headers: authHeaders(tokenEncargado),
    });
    assert.equal(caja.status, 200);
    assert.deepEqual(keys(caja.body), CAJA_KEYS);
    assert.deepEqual(keys(caja.body.resumen), RESUMEN_KEYS);

    for (const path of ["/api/historico", "/api/caja", "/api/caja/sesiones"]) {
      const response = await request<{ code: string; message: string }>(path, {
        headers: authHeaders(tokenCamarero),
      });
      assert.equal(response.status, 403, `${path} debe devolver 403`);
      assertError(response.body, "FORBIDDEN");
    }
  });
});

describe("contrato: ciclo de un servicio", () => {
  it("abrir un servicio devuelve todas las claves y totales en céntimos", async () => {
    const servicio = await abrirServicio();

    assert.deepEqual(keys(servicio), SERVICIO_KEYS);
    assert.equal(servicio.estado, "ABIERTA");
    assert.equal(servicio.closedAt, null);
    assert.equal(servicio.subtotal, 0);
    assert.equal(servicio.discount, 0);
    assert.equal(servicio.total, 0);
    assert.equal(servicio.lineas.length, 0);

    const apertura = servicio.eventos.find((evento) => evento.tipo === "APERTURA");
    assert.ok(apertura, "abrir debe registrar APERTURA");
    assert.deepEqual(keys(apertura), EVENTO_KEYS);
    assert.deepEqual(apertura.actor, { id: usuarioCamarero.id, nombre: usuarioCamarero.nombre });
  });

  it("añadir una línea respeta el contrato y suma el total", async () => {
    const sala = await request<{ productos: Array<{ id: number; precio: number }> }>("/api/sala");
    const producto = sala.body.productos[0];
    const servicio = await abrirServicio();

    const response = await request<{
      lineas: Array<Record<string, unknown> & { precioUnitario: number; cantidad: number }>;
      subtotal: number;
      total: number;
    }>(`/api/servicios/${servicio.id}/items`, {
      method: "POST",
      headers: authHeaders(tokenCamarero),
      body: { productoId: producto.id, cantidad: 2, numeroAsiento: 1 },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.lineas.length, 1);
    assert.deepEqual(keys(response.body.lineas[0]), LINEA_KEYS);
    assert.equal(response.body.subtotal, producto.precio * 2);
    assert.equal(response.body.total, response.body.subtotal);
  });

  it("un camarero no cobra (403) y un gerente sí (200)", async () => {
    const servicio = await abrirServicio();

    const denegado = await request<{ code: string; message: string }>(
      `/api/servicios/${servicio.id}/pagar`,
      { method: "POST", headers: authHeaders(tokenCamarero) },
    );

    assert.equal(denegado.status, 403);
    assertError(denegado.body, "FORBIDDEN");

    const cobrado = await request<{
      estado: string;
      closedAt: string | null;
      subtotal: number;
      discount: number;
      total: number;
    }>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      headers: authHeaders(tokenGerente),
    });

    assert.equal(cobrado.status, 200);
    assert.equal(cobrado.body.estado, "PAGADA");
    assert.notEqual(cobrado.body.closedAt, null);
    assert.equal(cobrado.body.total, cobrado.body.subtotal - cobrado.body.discount);
  });
});
