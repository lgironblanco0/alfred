import { prisma } from "../db";
import { HttpError } from "../errors";
import { servicioInclude } from "./include";
import { serializeMesa, serializeProducto, serializePromo } from "./serialize";

async function loadServicio(id: number) {
  const servicio = await prisma.servicio.findUnique({
    where: { id },
    include: servicioInclude,
  });
  if (!servicio) {
    throw new HttpError(404, "Servicio no encontrado");
  }
  return servicio;
}

async function openServicioOnMesa(mesaId: number) {
  return prisma.servicio.findFirst({
    where: {
      estado: "ABIERTA",
      mesas: { some: { mesaId } },
    },
    include: servicioInclude,
  });
}

export async function getSala() {
  const [mesas, productos, promos, servicios] = await Promise.all([
    prisma.mesa.findMany({
      orderBy: [{ zona: "asc" }, { clase: "asc" }, { layoutOrder: "asc" }, { numeroMesa: "asc" }],
    }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ destino: "asc" }, { nombre: "asc" }] }),
    prisma.promoCodigo.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } }),
    prisma.servicio.findMany({
      where: { estado: "ABIERTA" },
      include: servicioInclude,
    }),
  ]);

  const servicioByMesa = new Map<number, (typeof servicios)[number]>();
  for (const servicio of servicios) {
    for (const link of servicio.mesas) {
      servicioByMesa.set(link.mesaId, servicio);
    }
  }

  return {
    mesas: mesas.map((mesa) => serializeMesa(mesa, servicioByMesa.get(mesa.id) ?? null)),
    productos: productos.map(serializeProducto),
    promos: promos.map(serializePromo),
  };
}

export async function createWalkIn(input: {
  mesaId?: number;
  zona?: string;
  clase?: string;
  pax: number;
  createTable?: boolean;
  actorId?: number;
}) {
  const pax = Math.max(1, Math.floor(input.pax));
  let mesaId = input.mesaId;

  if (input.createTable) {
    const zona = input.zona ?? "RESTAURANTE";
    const clase = input.clase ?? "MESA";
    const last = await prisma.mesa.findFirst({
      where: { zona, clase },
      orderBy: { numeroMesa: "desc" },
    });
    const numeroMesa = (last?.numeroMesa ?? 0) + 1;
    const mesa = await prisma.mesa.create({
      data: {
        numeroMesa,
        capacidad: Math.max(pax, clase === "PUNTO_BARRA" ? 1 : 4),
        tipo: clase === "PUNTO_BARRA" ? "TABURETE" : pax > 4 ? "RECTANGULAR" : "CUADRADA",
        zona,
        clase,
        layoutOrder: numeroMesa,
      },
    });
    mesaId = mesa.id;
  }

  if (!mesaId) {
    throw new HttpError(400, "Selecciona una mesa o crea una nueva");
  }

  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
  if (!mesa) {
    throw new HttpError(404, "Mesa no encontrada");
  }

  const existing = await openServicioOnMesa(mesaId);
  if (existing) {
    throw new HttpError(409, "Esa mesa ya tiene un servicio abierto");
  }

  const servicio = await prisma.servicio.create({
    data: {
      pax,
      origen: "WALK_IN",
      mesas: { create: { mesaId } },
      eventos: {
        create: { tipo: "APERTURA", detalle: `Walk-in ${pax} pax`, actorId: input.actorId },
      },
    },
    include: servicioInclude,
  });

  return servicio;
}

export async function expandPax(servicioId: number, pax: number, actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }
  const nextPax = Math.max(1, Math.floor(pax));
  return prisma.servicio.update({
    where: { id: servicioId },
    data: {
      pax: nextPax,
      eventos: {
        create: { tipo: "PAX", detalle: `Capacidad de servicio a ${nextPax} pax`, actorId },
      },
    },
    include: servicioInclude,
  });
}

export async function mergeMesas(servicioId: number, mesaIds: number[], actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  const uniqueIds = [...new Set(mesaIds)];
  const mesas = await prisma.mesa.findMany({ where: { id: { in: uniqueIds } } });
  if (mesas.length !== uniqueIds.length) {
    throw new HttpError(404, "Alguna mesa no existe");
  }

  await prisma.$transaction(async (tx) => {
    for (const mesaId of uniqueIds) {
      if (servicio.mesas.some((link) => link.mesaId === mesaId)) {
        continue;
      }

      const other = await tx.servicio.findFirst({
        where: {
          estado: "ABIERTA",
          mesas: { some: { mesaId } },
          NOT: { id: servicioId },
        },
        include: { lineas: true },
      });

      if (other) {
        if (other.lineas.length > 0) {
          await tx.lineaPedido.updateMany({
            where: { servicioId: other.id, estado: { not: "ANULADO" } },
            data: { servicioId },
          });
        }
        await tx.servicio.update({
          where: { id: other.id },
          data: {
            estado: "CANCELADA",
            closedAt: new Date(),
            eventos: {
              create: { tipo: "MERGE", detalle: `Unida al servicio ${servicioId}`, actorId },
            },
          },
        });
        await tx.servicioMesa.deleteMany({ where: { servicioId: other.id } });
      }

      await tx.servicioMesa.create({ data: { servicioId, mesaId } });
    }

    const extraPax = mesas.reduce((sum, mesa) => sum + mesa.capacidad, 0);
    await tx.servicio.update({
      where: { id: servicioId },
      data: {
        pax: Math.max(servicio.pax, extraPax),
        eventos: {
          create: {
            tipo: "MERGE",
            detalle: `Mesas unidas: ${mesas.map((mesa) => mesa.numeroMesa).join(", ")}`,
            actorId,
          },
        },
      },
    });
  });

  return loadServicio(servicioId);
}

export async function cancelServicio(servicioId: number, motivo: string, actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  return prisma.servicio.update({
    where: { id: servicioId },
    data: {
      estado: "CANCELADA",
      closedAt: new Date(),
      eventos: {
        create: { tipo: "CANCELACION", detalle: motivo || "Servicio cancelado", actorId },
      },
    },
    include: servicioInclude,
  });
}

export async function addItem(input: {
  servicioId: number;
  productoId: number;
  cantidad?: number;
  numeroAsiento?: number | null;
  esCompartido?: boolean;
}) {
  const servicio = await loadServicio(input.servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  const producto = await prisma.producto.findUnique({ where: { id: input.productoId } });
  if (!producto || !producto.activo) {
    throw new HttpError(404, "Producto no disponible");
  }

  const esCompartido = Boolean(input.esCompartido) || input.numeroAsiento == null;
  const cantidad = Math.max(1, Math.floor(input.cantidad ?? 1));

  await prisma.lineaPedido.create({
    data: {
      servicioId: input.servicioId,
      productoId: producto.id,
      cantidad,
      numeroAsiento: esCompartido ? null : input.numeroAsiento,
      esCompartido,
      precioUnitario: producto.precio,
      estado: "PENDIENTE",
    },
  });

  return loadServicio(input.servicioId);
}

export async function callItems(servicioId: number, lineaIds?: number[], actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  const where = {
    servicioId,
    estado: "PENDIENTE",
    ...(lineaIds?.length ? { id: { in: lineaIds } } : {}),
  };

  await prisma.lineaPedido.updateMany({
    where,
    data: { estado: "CALLED", calledAt: new Date() },
  });

  await prisma.eventoServicio.create({
    data: { servicioId, tipo: "LLAMADA", detalle: "Pase enviado a cocina/barra", actorId },
    select: { id: true },
  });

  return loadServicio(servicioId);
}

export async function markReady(lineaId: number) {
  const linea = await prisma.lineaPedido.findUnique({ where: { id: lineaId } });
  if (!linea) {
    throw new HttpError(404, "Línea no encontrada");
  }
  if (linea.estado !== "CALLED") {
    throw new HttpError(409, "Solo se pueden marcar como READY las líneas llamadas");
  }

  await prisma.lineaPedido.update({
    where: { id: lineaId },
    data: { estado: "READY" },
  });

  return loadServicio(linea.servicioId);
}

export async function removeItem(lineaId: number, motivo: string, actorId?: number) {
  const linea = await prisma.lineaPedido.findUnique({ where: { id: lineaId } });
  if (!linea) {
    throw new HttpError(404, "Línea no encontrada");
  }
  if (linea.estado === "ANULADO") {
    throw new HttpError(409, "La línea ya está anulada");
  }
  if (!motivo) {
    throw new HttpError(400, "Indica el motivo de anulación");
  }

  await prisma.lineaPedido.update({
    where: { id: lineaId },
    data: { estado: "ANULADO", motivoAnulacion: motivo },
  });

  await prisma.eventoServicio.create({
    data: {
      servicioId: linea.servicioId,
      tipo: "ANULACION",
      detalle: `Línea ${lineaId}: ${motivo}`,
      actorId,
    },
    select: { id: true },
  });

  return loadServicio(linea.servicioId);
}

export async function applyPromo(servicioId: number, codigo: string, actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  const normalized = codigo.trim().toUpperCase();
  if (!normalized) {
    return prisma.servicio.update({
      where: { id: servicioId },
      data: {
        descuentoCodigo: null,
        descuentoTipo: null,
        descuentoValor: null,
        eventos: { create: { tipo: "DESCUENTO", detalle: "Promoción retirada", actorId } },
      },
      include: servicioInclude,
    });
  }

  const promo = await prisma.promoCodigo.findUnique({ where: { codigo: normalized } });
  if (!promo || !promo.activo) {
    throw new HttpError(404, "Código no válido");
  }

  return prisma.servicio.update({
    where: { id: servicioId },
    data: {
      descuentoCodigo: promo.codigo,
      descuentoTipo: promo.tipo,
      descuentoValor: promo.valor,
      eventos: {
        create: { tipo: "DESCUENTO", detalle: `Aplicado ${promo.codigo}`, actorId },
      },
    },
    include: servicioInclude,
  });
}

export async function setSplit(servicioId: number, splitModo: string) {
  const allowed = new Set(["NINGUNO", "IGUAL", "ASIENTO"]);
  if (!allowed.has(splitModo)) {
    throw new HttpError(400, "Modo de split no válido");
  }
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  return prisma.servicio.update({
    where: { id: servicioId },
    data: { splitModo },
    include: servicioInclude,
  });
}

export async function payServicio(servicioId: number, actorId?: number) {
  const servicio = await loadServicio(servicioId);
  if (servicio.estado !== "ABIERTA") {
    throw new HttpError(409, "El servicio no está abierto");
  }

  await prisma.lineaPedido.updateMany({
    where: { servicioId, estado: { in: ["PENDIENTE", "CALLED", "READY"] } },
    data: { estado: "PAID" },
  });

  return prisma.servicio.update({
    where: { id: servicioId },
    data: {
      estado: "PAGADA",
      closedAt: new Date(),
      eventos: { create: { tipo: "PAGO", detalle: "Cuenta cobrada", actorId } },
    },
    include: servicioInclude,
  });
}

export async function reorderMesas(
  items: Array<{ id: number; layoutOrder: number }>,
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.mesa.update({
        where: { id: item.id },
        data: { layoutOrder: item.layoutOrder },
      }),
    ),
  );
  return getSala();
}
