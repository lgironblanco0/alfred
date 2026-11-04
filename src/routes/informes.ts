import { Router } from "express";
import { asyncRoute } from "../asyncRoute";
import { prisma } from "../db";

export const informesRouter = Router();

informesRouter.get("/", asyncRoute(async (request, response) => {
  const dias = Math.min(90, Math.max(1, Number(request.query.dias ?? 30)));
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const servicios = await prisma.servicio.findMany({
    where: { estado: "PAGADA", closedAt: { gte: desde } },
    include: { lineas: { include: { producto: true } } },
    orderBy: { closedAt: "asc" },
  });
  const porDia = new Map<string, { cuentas: number; ventas: number }>();
  const productos = new Map<string, { nombre: string; unidades: number; ventas: number }>();
  let ventas = 0;
  for (const servicio of servicios) {
    const total = servicio.lineas.filter((linea) => linea.estado !== "ANULADO").reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
    ventas += total;
    const dia = (servicio.closedAt ?? servicio.openedAt).toISOString().slice(0, 10);
    const actual = porDia.get(dia) ?? { cuentas: 0, ventas: 0 };
    actual.cuentas += 1; actual.ventas += total; porDia.set(dia, actual);
    for (const linea of servicio.lineas.filter((linea) => linea.estado !== "ANULADO")) {
      const producto = productos.get(linea.producto.nombre) ?? { nombre: linea.producto.nombre, unidades: 0, ventas: 0 };
      producto.unidades += linea.cantidad; producto.ventas += linea.precioUnitario * linea.cantidad; productos.set(linea.producto.nombre, producto);
    }
  }
  response.json({ dias, desde: desde.toISOString(), cuentas: servicios.length, ventas, ticketMedio: servicios.length ? Math.round(ventas / servicios.length) : 0, porDia: [...porDia].map(([fecha, values]) => ({ fecha, ...values })), productos: [...productos.values()].sort((a, b) => b.unidades - a.unidades) });
}));
