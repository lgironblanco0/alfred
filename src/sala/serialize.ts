import type { LineaPedido, Mesa, Producto, PromoCodigo, Servicio, ServicioMesa } from "@prisma/client";

type ServicioWithRelations = Servicio & {
  mesas: (ServicioMesa & { mesa: Mesa })[];
  lineas: (LineaPedido & { producto: Producto })[];
  eventos?: {
    id: number;
    tipo: string;
    detalle: string;
    createdAt: Date;
    actor?: { id: number; nombre: string } | null;
  }[];
  pagos?: Array<{
    id: number;
    metodoPago: string;
    importe: number;
    propina: number;
    recibido: number | null;
    cambio: number | null;
    concepto: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
    actor?: { id: number; nombre: string } | null;
  }>;
};

export function centsToLabel(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

export function computeTotals(servicio: ServicioWithRelations) {
  const subtotal = servicio.lineas
    .filter((linea) => linea.estado !== "ANULADO")
    .reduce((sum, linea) => sum + linea.precioUnitario * linea.cantidad, 0);

  let discount = 0;
  if (servicio.descuentoTipo === "PORCENTAJE" && servicio.descuentoValor) {
    discount = Math.round((subtotal * servicio.descuentoValor) / 100);
  } else if (servicio.descuentoTipo === "FIJO" && servicio.descuentoValor) {
    discount = Math.min(servicio.descuentoValor, subtotal);
  }

  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}

export function serializeServicio(servicio: ServicioWithRelations) {
  const { subtotal, discount, total } = computeTotals(servicio);
  const labels = servicio.mesas
    .map((link) => mesaLabel(link.mesa))
    .sort((a, b) => a.localeCompare(b, "es"));

  const pagos = (servicio.pagos ?? []).map((pago) => ({
    id: pago.id,
    metodoPago: pago.metodoPago,
    importe: pago.importe,
    propina: pago.propina,
    recibido: pago.recibido,
    cambio: pago.cambio,
    concepto: pago.concepto,
    idempotencyKey: pago.idempotencyKey,
    createdAt: pago.createdAt.toISOString(),
    actor: pago.actor ? { id: pago.actor.id, nombre: pago.actor.nombre } : null,
  }));

  const pagado = pagos.reduce((sum, pago) => sum + pago.importe, 0);
  const propinaTotal = pagos.reduce((sum, pago) => sum + pago.propina, 0);
  const saldo = Math.max(0, total - pagado);

  return {
    id: servicio.id,
    estado: servicio.estado,
    pax: servicio.pax,
    origen: servicio.origen,
    openedAt: servicio.openedAt.toISOString(),
    closedAt: servicio.closedAt?.toISOString() ?? null,
    descuentoCodigo: servicio.descuentoCodigo,
    descuentoTipo: servicio.descuentoTipo,
    descuentoValor: servicio.descuentoValor,
    splitModo: servicio.splitModo,
    mesaIds: servicio.mesas.map((link) => link.mesaId),
    mesaLabels: labels,
    metodoPago: servicio.metodoPago ?? null,
    lineas: servicio.lineas
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((linea) => ({
        id: linea.id,
        productoId: linea.productoId,
        nombre: linea.producto.nombre,
        destino: linea.producto.destino,
        categoria: linea.producto.categoria,
        cantidad: linea.cantidad,
        numeroAsiento: linea.numeroAsiento,
        esCompartido: linea.esCompartido,
        estado: linea.estado,
        motivoAnulacion: linea.motivoAnulacion,
        precioUnitario: linea.precioUnitario,
        createdAt: linea.createdAt.toISOString(),
        calledAt: linea.calledAt?.toISOString() ?? null,
      })),
    eventos: (servicio.eventos ?? []).map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      detalle: evento.detalle,
      createdAt: evento.createdAt.toISOString(),
      actor: evento.actor ? { id: evento.actor.id, nombre: evento.actor.nombre } : null,
    })),
    pagos,
    subtotal,
    discount,
    total,
    pagado,
    propinaTotal,
    saldo,
  };
}

export function mesaLabel(mesa: Mesa): string {
  if (mesa.clase === "PUNTO_BARRA") {
    return `Barra ${mesa.numeroMesa}`;
  }
  if (mesa.zona === "TERRAZA") {
    return `T${mesa.numeroMesa}`;
  }
  if (mesa.zona === "COMEDOR_2") {
    return `C2-${mesa.numeroMesa}`;
  }
  if (mesa.zona === "BARRA") {
    return `B${mesa.numeroMesa}`;
  }
  return `${mesa.numeroMesa}`;
}

export function serializeMesa(
  mesa: Mesa,
  servicio: ServicioWithRelations | null,
) {
  return {
    id: mesa.id,
    numeroMesa: mesa.numeroMesa,
    capacidad: mesa.capacidad,
    tipo: mesa.tipo,
    zona: mesa.zona,
    clase: mesa.clase,
    layoutOrder: mesa.layoutOrder,
    label: mesaLabel(mesa),
    servicio: servicio ? serializeServicio(servicio) : null,
  };
}

export function serializeProducto(producto: Producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    destino: producto.destino,
    categoria: producto.categoria,
  };
}

export function serializePromo(promo: PromoCodigo) {
  return {
    codigo: promo.codigo,
    tipo: promo.tipo,
    valor: promo.valor,
  };
}
