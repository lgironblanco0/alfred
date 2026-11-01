import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { hashPassword } from "../src/auth/password.js";
import { prisma } from "../src/db.js";
import { authHeaders, login } from "./helpers/auth.js";

process.env.LOG_LEVEL = "silent";

/**
 * Pruebas de la Fase 3 (Gerencia).
 *
 * Cubren los criterios GA-01 a GA-10 de `docs/GERENCIA.md` contra la API real
 * y la base temporal del runner. Se escribieron antes de implementar las rutas.
 */

interface Respuesta<T> {
  status: number;
  body: T;
}

interface UsuarioPublico {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

interface Servicio {
  id: number;
  estado: string;
  metodoPago: string | null;
  total: number;
  closedAt: string | null;
  lineas: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
  eventos: Array<{ tipo: string; detalle: string }>;
}

interface SesionCaja {
  id: number;
  estado: string;
  fondoInicial: number;
  abiertaAt: string;
  abiertaPor: { id: number; nombre: string } | null;
  cerradaAt: string | null;
  cerradaPor: { id: number; nombre: string } | null;
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  notas: string | null;
}

interface ResumenCaja {
  ventasEfectivo: number;
  ventasTarjeta: number;
  totalCobrado: number;
  numeroCobros: number;
  efectivoEsperado: number;
}

interface Sala {
  mesas: Array<{ id: number; servicio: { id: number } | null }>;
  productos: Array<{ id: number; precio: number; nombre: string }>;
}

let server: Server;
let baseUrl: string;
let tokenGerente: string;
let tokenEncargado: string;
let tokenCamarero: string;

async function request<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Respuesta<T>> {
  const { token, ...rest } = init;
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

async function freeMesa(): Promise<number> {
  const response = await request<Sala>("/api/sala");
  const mesa = response.body.mesas.find((item) => !item.servicio);
  assert.ok(mesa, "la base de pruebas debe tener alguna mesa libre");
  return mesa.id;
}

async function openServicio(token: string): Promise<Servicio> {
  const response = await request<Servicio>("/api/servicios", {
    method: "POST",
    token,
    body: JSON.stringify({ mesaId: await freeMesa(), pax: 2 }),
  });
  assert.equal(response.status, 201);
  return response.body;
}

async function addProduct(token: string, servicioId: number, productoId: number, cantidad = 1) {
  const response = await request<Servicio>(`/api/servicios/${servicioId}/items`, {
    method: "POST",
    token,
    body: JSON.stringify({ productoId, cantidad, numeroAsiento: 1 }),
  });
  assert.equal(response.status, 201);
  return response.body;
}

before(async () => {
  const { app } = await import("../src/app.js");

  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("No se pudo obtener el puerto de pruebas");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;

  tokenGerente = await login(baseUrl, "0");
  tokenEncargado = await login(baseUrl, "1");
  tokenCamarero = await login(baseUrl, "5");
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

describe("GA-01/GA-02 — empleados y permisos", () => {
  it("el gerente crea un empleado y la respuesta no filtra el hash", async () => {
    const codigo = `emp${Date.now().toString(36)}`;
    const response = await request<{ usuario: UsuarioPublico & { passwordHash?: string } }>(
      "/api/usuarios",
      {
        method: "POST",
        token: tokenGerente,
        body: JSON.stringify({
          codigo,
          nombre: "Empleado de prueba",
          email: `${codigo}@alfred.local`,
          password: "contrasena-larga",
          rol: "ENCARGADO",
        }),
      },
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.usuario.rol, "ENCARGADO");
    assert.equal(response.body.usuario.activo, true);
    assert.equal("passwordHash" in response.body.usuario, false);

    // El empleado creado puede iniciar sesión con su código.
    const acceso = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    assert.equal(acceso.status, 200);
  });

  it("un encargado y un camarero no pueden listar ni crear empleados", async () => {
    for (const token of [tokenEncargado, tokenCamarero]) {
      const listado = await request<{ code: string }>("/api/usuarios", { token });
      assert.equal(listado.status, 403);
      assert.equal(listado.body.code, "FORBIDDEN");

      const creacion = await request<{ code: string }>("/api/usuarios", {
        method: "POST",
        token,
        body: JSON.stringify({
          codigo: `x${Math.random().toString(36).slice(2, 8)}`,
          nombre: "Sin permiso",
          email: `x${Math.random().toString(36).slice(2, 8)}@alfred.local`,
          password: "contrasena-larga",
          rol: "CAMARERO",
        }),
      });
      assert.equal(creacion.status, 403);
      assert.equal(creacion.body.code, "FORBIDDEN");
    }
  });
});

describe("GA-03 — el último gerente activo está protegido", () => {
  it("no se puede desactivar ni degradar al último gerente activo", async () => {
    const codigo = `ultimo${Date.now().toString(36)}`;
    const temporal = await prisma.usuario.create({
      data: {
        codigo,
        nombre: "Gerente temporal",
        email: `${codigo}@alfred.local`,
        passwordHash: await hashPassword("contrasena-larga"),
        rol: "GERENTE",
      },
    });

    const otrosGerentes = await prisma.usuario.findMany({
      where: { rol: "GERENTE", activo: true, id: { not: temporal.id } },
      select: { id: true },
    });

    try {
      const tokenTemporal = await login(baseUrl, codigo);

      // Deja al gerente temporal como único gerente activo.
      await prisma.usuario.updateMany({
        where: { id: { in: otrosGerentes.map((item) => item.id) } },
        data: { activo: false },
      });

      const desactivar = await request<{ code: string }>(`/api/usuarios/${temporal.id}`, {
        method: "PATCH",
        token: tokenTemporal,
        body: JSON.stringify({ activo: false }),
      });
      assert.equal(desactivar.status, 409);
      assert.equal(desactivar.body.code, "LAST_MANAGER");

      const degradar = await request<{ code: string }>(`/api/usuarios/${temporal.id}`, {
        method: "PATCH",
        token: tokenTemporal,
        body: JSON.stringify({ rol: "CAMARERO" }),
      });
      assert.equal(degradar.status, 409);
      assert.equal(degradar.body.code, "LAST_MANAGER");
    } finally {
      await prisma.usuario.updateMany({
        where: { id: { in: otrosGerentes.map((item) => item.id) } },
        data: { activo: true },
      });
      await prisma.usuario.delete({ where: { id: temporal.id } });
    }
  });
});

describe("GA-07 — método de pago en el cobro", () => {
  it("guarda TARJETA cuando se indica y EFECTIVO cuando se omite", async () => {
    const tarjeta = await openServicio(tokenEncargado);
    const pagadaTarjeta = await request<Servicio>(`/api/servicios/${tarjeta.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ metodoPago: "TARJETA" }),
    });

    assert.equal(pagadaTarjeta.status, 200);
    assert.equal(pagadaTarjeta.body.estado, "PAGADA");
    assert.equal(pagadaTarjeta.body.metodoPago, "TARJETA");

    const efectivo = await openServicio(tokenEncargado);
    const pagadaEfectivo = await request<Servicio>(`/api/servicios/${efectivo.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: "{}",
    });

    assert.equal(pagadaEfectivo.status, 200);
    assert.equal(pagadaEfectivo.body.metodoPago, "EFECTIVO");
  });

  it("rechaza un método de pago desconocido", async () => {
    const servicio = await openServicio(tokenEncargado);
    const response = await request<{ code: string }>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ metodoPago: "BITCOIN" }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, "VALIDATION_ERROR");
  });
});

describe("GA-04/GA-05 — histórico de cuentas", () => {
  it("lista solo servicios cerrados con filtros y paginación", async () => {
    const response = await request<{
      servicios: Servicio[];
      total: number;
      limit: number;
      offset: number;
    }>("/api/historico?limit=2&offset=0", { token: tokenEncargado });

    assert.equal(response.status, 200);
    assert.equal(response.body.limit, 2);
    assert.equal(response.body.offset, 0);
    assert.equal(response.body.servicios.length, 2);
    assert.ok(response.body.total >= 2);
    for (const servicio of response.body.servicios) {
      assert.ok(["PAGADA", "CANCELADA"].includes(servicio.estado));
      assert.ok(servicio.closedAt, "todo servicio del histórico debe tener fecha de cierre");
    }

    const canceladas = await request<{ servicios: Servicio[] }>(
      "/api/historico?estado=CANCELADA",
      { token: tokenEncargado },
    );
    assert.equal(canceladas.status, 200);
    assert.ok(canceladas.body.servicios.every((servicio) => servicio.estado === "CANCELADA"));

    const futuro = await request<{ servicios: Servicio[]; total: number }>(
      `/api/historico?desde=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}`,
      { token: tokenEncargado },
    );
    assert.equal(futuro.status, 200);
    assert.equal(futuro.body.total, 0);
  });

  it("el detalle incluye líneas, eventos, total y método de pago", async () => {
    const servicio = await openServicio(tokenEncargado);
    const sala = await request<Sala>("/api/sala");
    const producto = sala.body.productos[0];
    await addProduct(tokenEncargado, servicio.id, producto.id, 2);

    const cobrado = await request<Servicio>(`/api/servicios/${servicio.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ metodoPago: "TARJETA" }),
    });
    assert.equal(cobrado.status, 200);

    const detalle = await request<{ servicio: Servicio }>(`/api/historico/${servicio.id}`, {
      token: tokenEncargado,
    });

    assert.equal(detalle.status, 200);
    assert.equal(detalle.body.servicio.id, servicio.id);
    assert.equal(detalle.body.servicio.metodoPago, "TARJETA");
    assert.equal(detalle.body.servicio.total, producto.precio * 2);
    assert.ok(detalle.body.servicio.lineas.length > 0);
    assert.ok(detalle.body.servicio.eventos.some((evento) => evento.tipo === "PAGO"));
  });

  it("un servicio abierto no forma parte del histórico", async () => {
    const abierto = await openServicio(tokenEncargado);
    const response = await request<{ code: string }>(`/api/historico/${abierto.id}`, {
      token: tokenEncargado,
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.code, "NOT_FOUND");
  });
});

describe("GA-06 — el camarero no accede a gerencia", () => {
  it("recibe 403 en histórico y en todas las rutas de caja", async () => {
    const historico = await request<{ code: string }>("/api/historico", { token: tokenCamarero });
    assert.equal(historico.status, 403);
    assert.equal(historico.body.code, "FORBIDDEN");

    for (const [path, method] of [
      ["/api/caja", "GET"],
      ["/api/caja/abrir", "POST"],
      ["/api/caja/cerrar", "POST"],
      ["/api/caja/sesiones", "GET"],
    ] as const) {
      const response = await request<{ code: string }>(path, {
        method,
        token: tokenCamarero,
        body: method === "POST" ? JSON.stringify({ fondoInicial: 0, efectivoContado: 0 }) : undefined,
      });
      assert.equal(response.status, 403, `${method} ${path} debe devolver 403`);
      assert.equal(response.body.code, "FORBIDDEN");
    }
  });
});

describe("GA-08/GA-09/GA-10 — arqueo de caja", () => {
  it("abre una única sesión, calcula el esperado y la cierra con diferencia", async () => {
    const inicial = await request<{ sesion: SesionCaja | null; resumen: ResumenCaja }>("/api/caja", {
      token: tokenEncargado,
    });
    assert.equal(inicial.status, 200);
    assert.equal(inicial.body.sesion, null);

    const fondo = 10_000;
    const abrir = await request<{ sesion: SesionCaja }>("/api/caja/abrir", {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ fondoInicial: fondo }),
    });
    assert.equal(abrir.status, 201);
    assert.equal(abrir.body.sesion.estado, "ABIERTA");
    assert.equal(abrir.body.sesion.fondoInicial, fondo);
    assert.equal(abrir.body.sesion.abiertaPor?.nombre, "Responsable");

    const segunda = await request<{ code: string }>("/api/caja/abrir", {
      method: "POST",
      token: tokenGerente,
      body: JSON.stringify({ fondoInicial: fondo }),
    });
    assert.equal(segunda.status, 409);
    assert.equal(segunda.body.code, "CAJA_ABIERTA");

    // Cobro en efectivo dentro de la sesión: debe sumar al esperado.
    const sala = await request<Sala>("/api/sala");
    const producto = sala.body.productos[0];

    const efectivo = await openServicio(tokenEncargado);
    await addProduct(tokenEncargado, efectivo.id, producto.id, 2);
    const cobroEfectivo = await request<Servicio>(`/api/servicios/${efectivo.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ metodoPago: "EFECTIVO" }),
    });
    assert.equal(cobroEfectivo.status, 200);

    // Cobro con tarjeta: no suma al efectivo esperado.
    const tarjeta = await openServicio(tokenEncargado);
    await addProduct(tokenEncargado, tarjeta.id, producto.id, 3);
    const cobroTarjeta = await request<Servicio>(`/api/servicios/${tarjeta.id}/pagar`, {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ metodoPago: "TARJETA" }),
    });
    assert.equal(cobroTarjeta.status, 200);

    const esperado = fondo + cobroEfectivo.body.total;
    const estado = await request<{ sesion: SesionCaja; resumen: ResumenCaja }>("/api/caja", {
      token: tokenEncargado,
    });
    assert.equal(estado.status, 200);
    assert.equal(estado.body.sesion?.id, abrir.body.sesion.id);
    assert.equal(estado.body.resumen.efectivoEsperado, esperado);
    assert.equal(estado.body.resumen.ventasEfectivo, cobroEfectivo.body.total);
    assert.equal(estado.body.resumen.ventasTarjeta, cobroTarjeta.body.total);
    assert.equal(estado.body.resumen.numeroCobros, 2);
    assert.equal(
      estado.body.resumen.totalCobrado,
      cobroEfectivo.body.total + cobroTarjeta.body.total,
    );

    const contado = esperado - 500;
    const cerrar = await request<{ sesion: SesionCaja }>("/api/caja/cerrar", {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ efectivoContado: contado, notas: "Faltan 5 €" }),
    });
    assert.equal(cerrar.status, 200);
    assert.equal(cerrar.body.sesion.estado, "CERRADA");
    assert.equal(cerrar.body.sesion.efectivoEsperado, esperado);
    assert.equal(cerrar.body.sesion.efectivoContado, contado);
    assert.equal(cerrar.body.sesion.diferencia, -500);
    assert.equal(cerrar.body.sesion.notas, "Faltan 5 €");
    assert.ok(cerrar.body.sesion.cerradaAt);
    assert.equal(cerrar.body.sesion.cerradaPor?.nombre, "Responsable");

    const sinSesion = await request<{ sesion: SesionCaja | null }>("/api/caja", {
      token: tokenEncargado,
    });
    assert.equal(sinSesion.body.sesion, null);

    const segundaCierre = await request<{ code: string }>("/api/caja/cerrar", {
      method: "POST",
      token: tokenEncargado,
      body: JSON.stringify({ efectivoContado: contado }),
    });
    assert.equal(segundaCierre.status, 409);
    assert.equal(segundaCierre.body.code, "CAJA_NO_ABIERTA");

    const sesiones = await request<{ sesiones: SesionCaja[] }>("/api/caja/sesiones?limit=5", {
      token: tokenEncargado,
    });
    assert.equal(sesiones.status, 200);
    assert.ok(sesiones.body.sesiones.some((sesion) => sesion.id === abrir.body.sesion.id));
  });
});
