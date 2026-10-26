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
    },
  },
};
