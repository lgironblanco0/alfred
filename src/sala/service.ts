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
  actorId?: number;
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

  await prisma.eventoServicio.create({
    data: {
      servicioId: input.servicioId,
      tipo: "PEDIDO",
      detalle: `${cantidad}× ${producto.nombre}${esCompartido ? "" : ` (asiento ${input.numeroAsiento})`}`,
      actorId: input.actorId,
    },
    select: { id: true },
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

export async function markReady(lineaId: number, actorId?: number) {
  const linea = await prisma.lineaPedido.findUnique({
    where: { id: lineaId },
    include: { producto: true },
  });
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

  await prisma.eventoServicio.create({
    data: {
      servicioId: linea.servicioId,
      tipo: "LISTO",
      detalle: `${linea.producto.nombre} lista para servir`,
      actorId,
    },
    select: { id: true },
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

export async function setSplit(servicioId: number, splitModo: string, actorId?: number) {
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
    data: {
      splitModo,
      eventos: { create: { tipo: "SPLIT", detalle: `Reparto: ${splitModo}`, actorId } },
    },
    include: servicioInclude,
  });
}

export async function payServicio(input: {
  servicioId: number;
  actorId?: number;
  metodoPago?: "EFECTIVO" | "TARJETA";
  efectivoEntregado?: number;
  importe?: number;
  propina?: number;
  concepto?: string;
  pagos?: Array<{
    metodoPago: "EFECTIVO" | "TARJETA";
    importe: number;
    propina?: number;
    recibido?: number;
    concepto?: string;
  }>;
  idempotencyKey?: string;
}) {
  const { computeTotals } = await import("./serialize.js");

  return prisma.$transaction(async (tx) => {
    const servicio = await tx.servicio.findUnique({
      where: { id: input.servicioId },
      include: servicioInclude,
    });
    if (!servicio) {
      throw new HttpError(404, "Servicio no encontrado");
    }
    if (servicio.estado !== "ABIERTA") {
      if (input.idempotencyKey && servicio.pagos.some((pago) => pago.idempotencyKey === input.idempotencyKey)) return servicio;
      throw new HttpError(409, "El servicio no está abierto");
    }
    if (input.idempotencyKey && servicio.pagos.some((pago) => pago.idempotencyKey === input.idempotencyKey)) return servicio;

    const { total } = computeTotals(servicio as any);
    const pagadoExistente = (servicio.pagos ?? []).reduce(
      (sum: number, pago: { importe: number }) => sum + pago.importe,
      0,
    );
    const saldoActual = Math.max(0, total - pagadoExistente);

    const pagosARegistrar: Array<{
      metodoPago: string;
      importe: number;
      propina: number;
      recibido: number | null;
      cambio: number | null;
      concepto: string | null;
    }> = [];

    if (input.pagos && input.pagos.length > 0) {
      const suma = input.pagos.reduce((sum, pago) => sum + Math.floor(pago.importe), 0);
      if (suma > saldoActual) {
        throw new HttpError(400, "El importe supera el saldo pendiente");
      }
      for (const pago of input.pagos) {
        const propina = Math.max(0, Math.floor(pago.propina ?? 0));
        const importe = Math.floor(pago.importe);
        if (importe <= 0) {
          throw new HttpError(400, "El importe debe ser positivo");
        }
        const recibido = pago.metodoPago === "EFECTIVO" && typeof pago.recibido === "number" ? Math.floor(pago.recibido) : null;
        if (pago.metodoPago === "EFECTIVO" && recibido !== null && recibido < importe + propina) {
          throw new HttpError(400, "El efectivo entregado no es suficiente");
        }
        const cambio = pago.metodoPago === "EFECTIVO" && recibido !== null ? Math.max(0, recibido - (importe + propina)) : null;
        pagosARegistrar.push({
          metodoPago: pago.metodoPago,
          importe,
          propina,
          recibido,
          cambio,
          concepto: pago.concepto?.trim() || null,
        });
      }
    } else {
      const metodoPago = input.metodoPago ?? "EFECTIVO";
      const propina = Math.max(0, Math.floor(input.propina ?? 0));
      const importeSolicitado =
        typeof input.importe === "number" ? Math.floor(input.importe) : saldoActual;
      if (importeSolicitado <= 0 && saldoActual > 0) {
        throw new HttpError(400, "El importe debe ser positivo");
      }
      if (importeSolicitado > saldoActual) {
        throw new HttpError(400, "El importe supera el saldo pendiente");
      }
      const importe = importeSolicitado;
      if (importe <= 0 && propina > 0) {
        throw new HttpError(400, "No queda saldo por cobrar");
      }
      if (importe > 0) {
        const recibido = metodoPago === "EFECTIVO" && typeof input.efectivoEntregado === "number" ? Math.floor(input.efectivoEntregado) : null;
        if (metodoPago === "EFECTIVO" && recibido !== null && recibido < importe + propina) {
          throw new HttpError(400, "El efectivo entregado no es suficiente");
        }
        const cambio = metodoPago === "EFECTIVO" && recibido !== null ? Math.max(0, recibido - (importe + propina)) : null;
        pagosARegistrar.push({
          metodoPago,
          importe,
          propina,
          recibido,
          cambio,
          concepto: input.concepto?.trim() || null,
        });
      }
    }

    for (const pago of pagosARegistrar) {
      await tx.pago.create({
        data: {
          servicioId: input.servicioId,
          metodoPago: pago.metodoPago,
          importe: pago.importe,
          propina: pago.propina,
          recibido: pago.recibido,
          cambio: pago.cambio,
          concepto: pago.concepto,
          actorId: input.actorId,
          idempotencyKey: input.idempotencyKey,
        },
      });
    }

    const pagosTras = await tx.pago.findMany({
      where: { servicioId: input.servicioId },
    });
    const pagadoTras = pagosTras.reduce((sum, pago) => sum + pago.importe, 0);
    const saldoTras = Math.max(0, total - pagadoTras);
    const metodos = [...new Set(pagosTras.map((pago) => pago.metodoPago))];
    const metodoPagoFinal =
      metodos.length === 1
        ? metodos[0]
        : metodos.length > 1
          ? "MIXTO"
          : (input.metodoPago ?? "EFECTIVO");

    await tx.eventoServicio.create({
      data: {
        servicioId: input.servicioId,
        tipo: "PAGO",
        detalle:
          pagosARegistrar.length === 0
            ? "Cuenta sin saldo cobrada"
            : pagosARegistrar.length === 1
              ? `Cobro · ${pagosARegistrar[0].metodoPago} · importe ${pagosARegistrar[0].importe} céntimos${pagosARegistrar[0].propina > 0 ? ` · propina ${pagosARegistrar[0].propina}` : ""}${pagosARegistrar[0].cambio !== null ? ` · cambio ${pagosARegistrar[0].cambio}` : ""}`
              : `Cobro por partes · ${pagosARegistrar.length} pagos · ${pagosARegistrar.reduce((s, p) => s + p.importe, 0)} céntimos`,
        actorId: input.actorId,
      },
      select: { id: true },
    });

    if (saldoTras === 0) {
      await tx.lineaPedido.updateMany({
        where: { servicioId: input.servicioId, estado: { in: ["PENDIENTE", "CALLED", "READY"] } },
        data: { estado: "PAID" },
      });
      await tx.servicio.update({
        where: { id: input.servicioId },
        data: {
          estado: "PAGADA",
          closedAt: new Date(),
          metodoPago: metodoPagoFinal,
        },
      });
    } else {
      await tx.servicio.update({
        where: { id: input.servicioId },
        data: {
          metodoPago: metodoPagoFinal,
        },
      });
    }

    const actualizado = await tx.servicio.findUnique({
      where: { id: input.servicioId },
      include: servicioInclude,
    });
    return actualizado as any;
  });
}

export async function refundServicio(servicioId: number, importe: number, motivo: string, actorId?: number) {
  return prisma.$transaction(async (tx) => {
    const servicio = await tx.servicio.findUnique({ where: { id: servicioId }, include: servicioInclude });
    if (!servicio) throw new HttpError(404, "Servicio no encontrado");
    if (servicio.estado !== "PAGADA") throw new HttpError(409, "Solo se puede devolver una cuenta pagada");
    const pagado = (servicio.pagos ?? []).reduce((sum, pago) => sum + pago.importe, 0);
    if (importe > pagado) throw new HttpError(400, "La devolución supera lo cobrado");
    await tx.pago.create({ data: { servicioId, metodoPago: "DEVOLUCION", importe: -importe, concepto: motivo, actorId } });
    await tx.eventoServicio.create({ data: { servicioId, tipo: "DEVOLUCION", detalle: `Devolución de ${importe} céntimos: ${motivo}`, actorId } });
    return tx.servicio.findUnique({ where: { id: servicioId }, include: servicioInclude }) as any;
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
