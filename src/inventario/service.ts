import { prisma } from "../db";
import { HttpError } from "../errors";

export async function list() {
  const defaults = [
    ["Coca-Cola", "CAJA", 5],
    ["Nestea", "CAJA", 5],
    ["Aquarius limón", "CAJA", 5],
    ["Ron Santa Teresa", "UNIDAD", 3],
    ["Absolut Vodka", "UNIDAD", 3],
    ["Whisky Macallan", "UNIDAD", 3],
  ] as const;
  for (const [nombre, unidad, existencias] of defaults) {
    await prisma.inventarioItem.upsert({
      where: { nombre },
      update: {},
      create: { nombre, unidad, existencias, umbralBajo: 1 },
    });
  }
  return prisma.inventarioItem.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
}

export async function restock(itemId: number, cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new HttpError(400, "La cantidad debe ser positiva");
  return prisma.inventarioItem.update({ where: { id: itemId }, data: { existencias: { increment: cantidad } } });
}

export async function requestItems(items: Array<{ itemId: number; cantidad: number }>, solicitanteId: number) {
  if (items.length === 0) throw new HttpError(400, "Añade al menos un producto");
  return prisma.$transaction(async (tx) => {
    const unique = new Map<number, number>();
    for (const item of items) unique.set(item.itemId, (unique.get(item.itemId) ?? 0) + item.cantidad);
    const rows = [] as Array<{ itemId: number; cantidad: number }>;
    for (const [itemId, cantidad] of unique) {
      if (!Number.isInteger(cantidad) || cantidad <= 0) throw new HttpError(400, "La cantidad debe ser positiva");
      const item = await tx.inventarioItem.findUnique({ where: { id: itemId } });
      if (!item || !item.activo) throw new HttpError(404, "Producto de inventario no encontrado");
      if (item.existencias < cantidad) throw new HttpError(409, `No hay suficientes existencias de ${item.nombre}`);
      await tx.inventarioItem.update({ where: { id: itemId }, data: { existencias: { decrement: cantidad } } });
      rows.push({ itemId, cantidad });
    }
    return tx.inventarioSolicitud.create({ data: { solicitanteId, lineas: { create: rows } }, include: { lineas: { include: { item: true } } } });
  });
}
