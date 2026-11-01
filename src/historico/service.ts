import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { servicioInclude } from "../sala/include";
import { serializeServicio } from "../sala/serialize";

/**
 * Histórico de cuentas: solo lectura y solo servicios cerrados.
 * Ver decisiones G-3 y G-8 de `docs/GERENCIA.md`.
 */

const ESTADOS_HISTORICO = ["PAGADA", "CANCELADA"] as const;
type EstadoHistorico = (typeof ESTADOS_HISTORICO)[number];

export interface HistoricoFilters {
  desde?: Date;
  hasta?: Date;
  estado?: EstadoHistorico;
  limit: number;
  offset: number;
}

export async function listHistorico(filters: HistoricoFilters) {
  const closedAt: Prisma.DateTimeNullableFilter = { not: null };

  if (filters.desde) {
    closedAt.gte = filters.desde;
  }
  if (filters.hasta) {
    closedAt.lte = filters.hasta;
  }

  const where: Prisma.ServicioWhereInput = {
    estado: filters.estado ?? { in: [...ESTADOS_HISTORICO] },
    closedAt,
  };

  const [servicios, total] = await prisma.$transaction([
    prisma.servicio.findMany({
      where,
      include: servicioInclude,
      orderBy: [{ closedAt: "desc" }, { id: "desc" }],
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.servicio.count({ where }),
  ]);

  return {
    servicios: servicios.map(serializeServicio),
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export async function getHistoricoServicio(id: number) {
  const servicio = await prisma.servicio.findUnique({
    where: { id },
    include: servicioInclude,
  });

  if (!servicio || !ESTADOS_HISTORICO.includes(servicio.estado as EstadoHistorico)) {
    throw new HttpError(404, "Servicio no encontrado en el histórico", {
      code: "NOT_FOUND",
    });
  }

  return serializeServicio(servicio);
}
