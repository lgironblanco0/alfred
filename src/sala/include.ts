export const servicioInclude = {
  mesas: { include: { mesa: true } },
  lineas: { include: { producto: true } },
  eventos: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      tipo: true,
      detalle: true,
      createdAt: true,
      actor: { select: { id: true, nombre: true } },
    },
  },
  pagos: {
    orderBy: { createdAt: "asc" as const },
    include: {
      actor: { select: { id: true, nombre: true } },
    },
  },
};
