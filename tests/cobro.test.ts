import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { prisma } from "../src/db.js";
import { login } from "./helpers/auth.js";

process.env.LOG_LEVEL = "silent";

interface Respuesta<T> {
  status: number;
  body: T;
}

interface Servicio {
  id: number;
  estado: string;
  metodoPago: string | null;
  total: number;
  pagado: number;
  propinaTotal: number;
  saldo: number;
  pagos: Array<{ metodoPago: string; importe: number; propina: number; cambio: number | null }>;
}

let server: Server;
let baseUrl: string;
let token: string;

async function request<T>(path: string, init: RequestInit = {}): Promise<Respuesta<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

before(async () => {
  const { app } = await import("../src/app.js");
  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("sin puerto");
  baseUrl = `http://127.0.0.1:${address.port}`;
  token = await login(baseUrl, "1");
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

async function abrirConProducto() {
  const sala = await request<{
    mesas: Array<{ id: number; servicio: { id: number } | null }>;
    productos: Array<{ id: number; precio: number }>;
  }>("/api/sala");
  const mesa = sala.body.mesas.find((item) => !item.servicio);
  const producto = sala.body.productos[0];
  assert.ok(mesa && producto);
  const abierto = await request<Servicio>("/api/servicios", {
    method: "POST",
    body: JSON.stringify({ mesaId: mesa.id, pax: 2 }),
  });
  assert.equal(abierto.status, 201);
  const conLinea = await request<Servicio>(`/api/servicios/${abierto.body.id}/items`, {
    method: "POST",
    body: JSON.stringify({ productoId: producto.id, cantidad: 2, numeroAsiento: 1 }),
  });
  assert.equal(conLinea.status, 201);
  return conLinea.body;
}

describe("cobro por partes y propina", () => {
  it("un cobro parcial deja saldo y no cierra", async () => {
    const servicio = await abrirConProducto();
    const parcial = Math.floor(servicio.total / 2);
    const response = await request<Servicio>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({ metodoPago: "TARJETA", importe: parcial, concepto: "Asiento 1" }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.estado, "ABIERTA");
    assert.equal(response.body.pagado, parcial);
    assert.equal(response.body.saldo, servicio.total - parcial);
  });

  it("la propina no reduce el saldo y el efectivo insuficiente se rechaza", async () => {
    const servicio = await abrirConProducto();
    const corto = await request<{ code: string }>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({
        metodoPago: "EFECTIVO",
        importe: servicio.total,
        propina: 100,
        efectivoEntregado: servicio.total,
      }),
    });
    assert.equal(corto.status, 400);

    const cobrado = await request<Servicio>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({
        metodoPago: "EFECTIVO",
        importe: servicio.total,
        propina: 100,
        efectivoEntregado: servicio.total + 500,
      }),
    });
    assert.equal(cobrado.status, 200);
    assert.equal(cobrado.body.estado, "PAGADA");
    assert.equal(cobrado.body.pagado, servicio.total);
    assert.equal(cobrado.body.propinaTotal, 100);
    assert.equal(cobrado.body.saldo, 0);
    assert.equal(cobrado.body.pagos[0]?.cambio, 400);
  });

  it("un cobro mixto cierra cuando cubre el saldo", async () => {
    const servicio = await abrirConProducto();
    const mitad = Math.floor(servicio.total / 2);
    const response = await request<Servicio>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({
        pagos: [
          { metodoPago: "EFECTIVO", importe: mitad, concepto: "Parte efectivo" },
          { metodoPago: "TARJETA", importe: servicio.total - mitad, concepto: "Parte tarjeta" },
        ],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.estado, "PAGADA");
    assert.equal(response.body.metodoPago, "MIXTO");
    assert.equal(response.body.saldo, 0);
    assert.equal(response.body.pagos.length, 2);
  });

  it("rechaza un segundo cobro sobre una cuenta ya pagada", async () => {
    const servicio = await abrirConProducto();
    const primero = await request<Servicio>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({ metodoPago: "TARJETA" }),
    });
    assert.equal(primero.status, 200);

    const segundo = await request<{ code: string }>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      body: JSON.stringify({ metodoPago: "TARJETA" }),
    });
    assert.equal(segundo.status, 409);
  });
});
