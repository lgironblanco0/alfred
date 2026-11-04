import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { servicioInclude } from "../sala/include";
import { computeTotals } from "../sala/serialize";
import { serializeSesionCaja } from "./serialize";

/**
 * Arqueo de caja (decisiones G-5 a G-7 de `docs/GERENCIA.md`).
 *
 * El efectivo esperado es el fondo inicial más los cobros en efectivo
 * cerrados dentro de la sesión. La tarjeta se mide, pero no entra en el cajón.
 */

type ClienteDb = PrismaClient | Prisma.TransactionClient;

const actorSelect = { select: { id: true, nombre: true } } as const;

const sesionInclude = {
  abiertaPor: actorSelect,
  cerradaPor: actorSelect,
} as const;

export interface ResumenCaja {
  ventasEfectivo: number;
  ventasTarjeta: number;
  totalCobrado: number;
  numeroCobros: number;
  efectivoEsperado: number;
}

const resumenVacio: ResumenCaja = {
  ventasEfectivo: 0,
  ventasTarjeta: 0,
  totalCobrado: 0,
  numeroCobros: 0,
  efectivoEsperado: 0,
};

async function buildResumen(
  client: ClienteDb,
  abiertaAt: Date | null,
  fondoInicial: number,
): Promise<ResumenCaja> {
  if (!abiertaAt) {
    return { ...resumenVacio };
  }

  const servicios = await client.servicio.findMany({
    where: {
      estado: "PAGADA",
      closedAt: { gte: abiertaAt },
    },
    include: servicioInclude,
  });

  let ventasEfectivo = 0;
  let ventasTarjeta = 0;

  for (const servicio of servicios) {
    const { total } = computeTotals(servicio);
    const pagos = servicio.pagos ?? [];
    if (pagos.length > 0) {
      for (const pago of pagos) {
        if (pago.metodoPago === "TARJETA") ventasTarjeta += pago.importe;
        else ventasEfectivo += pago.importe;
      }
    } else if (servicio.metodoPago === "TARJETA") {
      ventasTarjeta += total;
    } else {
      ventasEfectivo += total;
    }
  }

  return {
    ventasEfectivo,
    ventasTarjeta,
    totalCobrado: ventasEfectivo + ventasTarjeta,
    numeroCobros: servicios.length,
    efectivoEsperado: fondoInicial + ventasEfectivo,
  };
}

async function findOpenSession(client: ClienteDb) {
  return client.sesionCaja.findFirst({
    where: { estado: "ABIERTA" },
    orderBy: { id: "desc" },
    include: sesionInclude,
  });
}

export async function getCaja() {
  const sesion = await findOpenSession(prisma);
  const resumen = await buildResumen(
    prisma,
    sesion?.abiertaAt ?? null,
    sesion?.fondoInicial ?? 0,
  );

  return {
    sesion: sesion ? serializeSesionCaja(sesion) : null,
    resumen,
  };
}

export async function openCaja(fondoInicial: number, actorId?: number) {
  return prisma.$transaction(async (tx) => {
    const abierta = await findOpenSession(tx);
    if (abierta) {
      throw new HttpError(409, "Ya hay una caja abierta", { code: "CAJA_ABIERTA" });
    }

    const sesion = await tx.sesionCaja.create({
      data: { fondoInicial, abiertaPorId: actorId },
      include: sesionInclude,
    });

    return serializeSesionCaja(sesion);
  });
}

export async function closeCaja(
  efectivoContado: number,
  notas: string | undefined,
  actorId?: number,
) {
  return prisma.$transaction(async (tx) => {
    const abierta = await findOpenSession(tx);
    if (!abierta) {
      throw new HttpError(409, "No hay ninguna caja abierta", { code: "CAJA_NO_ABIERTA" });
    }

    const resumen = await buildResumen(tx, abierta.abiertaAt, abierta.fondoInicial);

    const sesion = await tx.sesionCaja.update({
      where: { id: abierta.id },
      data: {
        estado: "CERRADA",
        cerradaAt: new Date(),
        cerradaPorId: actorId,
        efectivoEsperado: resumen.efectivoEsperado,
        efectivoContado,
        diferencia: efectivoContado - resumen.efectivoEsperado,
        notas: notas ?? null,
      },
      include: sesionInclude,
    });

    return { sesion: serializeSesionCaja(sesion), resumen };
  });
}

export async function listSesiones(limit: number) {
  const sesiones = await prisma.sesionCaja.findMany({
    where: { estado: "CERRADA" },
    orderBy: [{ cerradaAt: "desc" }, { id: "desc" }],
    take: limit,
    include: sesionInclude,
  });

  return sesiones.map(serializeSesionCaja);
}
