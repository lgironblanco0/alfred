import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { authHeaders, login } from "./helpers/auth.js";

process.env.LOG_LEVEL = "silent";

interface Evento {
  tipo: string;
  detalle: string;
  actor: { id: number; nombre: string } | null;
}

interface Servicio {
  id: number;
  mesaIds: number[];
  eventos: Evento[];
}

interface Sala {
  productos: Array<{ id: number; nombre: string }>;
}

let server: Server;
let baseUrl: string;
let token: string;
let usuario: { id: number; nombre: string };
let producto: { id: number; nombre: string };

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
  token = await login(baseUrl, "5");

  const me = (await (await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders(token) })).json()) as {
    usuario: { id: number; nombre: string };
  };
  usuario = me.usuario;

  const sala = (await (await fetch(`${baseUrl}/api/sala`)).json()) as Sala;
  producto = sala.productos[0];
  assert.ok(producto, "el seed debe dejar productos activos");
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const { prisma } = await import("../src/db.js");
  await prisma.$disconnect();
});

async function abrirMesaNueva(): Promise<Servicio> {
  const response = await fetch(`${baseUrl}/api/servicios`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ createTable: true, pax: 2 }),
  });

  assert.equal(response.status, 201);
  return (await response.json()) as Servicio;
}

describe("pruebas de integración sobre una base desechable", () => {
  it("abrir dos veces la misma mesa devuelve 409 de forma determinista", async () => {
    const servicio = await abrirMesaNueva();
    const [mesaId] = servicio.mesaIds;

    const response = await fetch(`${baseUrl}/api/servicios`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ mesaId, pax: 2 }),
    });

    assert.equal(response.status, 409);
    assert.equal(((await response.json()) as { code: string }).code, "CONFLICT");
  });

  it("añadir un producto registra el actor autenticado en el evento", async () => {
    const servicio = await abrirMesaNueva();

    const response = await fetch(`${baseUrl}/api/servicios/${servicio.id}/items`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ productoId: producto.id, cantidad: 1, numeroAsiento: 1 }),
    });

    assert.equal(response.status, 201);

    const actualizado = (await response.json()) as Servicio;
    const pedido = actualizado.eventos.find((evento) => evento.tipo === "PEDIDO");

    assert.ok(pedido, "debe existir un evento PEDIDO");
    assert.match(pedido.detalle, new RegExp(producto.nombre));
    assert.deepEqual(pedido.actor, { id: usuario.id, nombre: usuario.nombre });
  });

  it("la apertura también queda atribuida al empleado", async () => {
    const servicio = await abrirMesaNueva();
    const apertura = servicio.eventos.find((evento) => evento.tipo === "APERTURA");

    assert.ok(apertura);
    assert.deepEqual(apertura.actor, { id: usuario.id, nombre: usuario.nombre });
  });
});
