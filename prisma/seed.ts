import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

if (process.env.NODE_ENV === "production" && process.env.ALFRED_ALLOW_DEMO_SEED !== "1") {
  console.error(
    "El seed de demostración no se ejecuta en producción.\n" +
      "Crea el primer administrador con `npm run db:create-admin`.\n" +
      "Si de verdad quieres cargar los datos de demo, define ALFRED_ALLOW_DEMO_SEED=1.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const mesas = [
  ...[1, 2, 3, 4, 5].map((numeroMesa) => ({
    numeroMesa,
    capacidad: 4,
    tipo: "CUADRADA",
    zona: "RESTAURANTE",
    clase: "MESA",
    layoutOrder: numeroMesa,
  })),
  ...[1, 2, 3, 4, 5].map((numeroMesa) => ({
    numeroMesa,
    capacidad: 4,
    tipo: "CUADRADA",
    zona: "TERRAZA",
    clase: "MESA",
    layoutOrder: numeroMesa,
  })),
  // Tercera zona de comedor (bloque 4.0): misma rejilla de cinco mesas que
  // Comedor y Terraza para que la sala se lea de un vistazo.
  ...[1, 2, 3, 4, 5].map((numeroMesa) => ({
    numeroMesa,
    capacidad: 4,
    tipo: "CUADRADA",
    zona: "COMEDOR_2",
    clase: "MESA",
    layoutOrder: numeroMesa,
  })),
  ...[1, 2, 3, 4, 5].map((numeroMesa) => ({
    numeroMesa,
    capacidad: 4,
    tipo: "CUADRADA",
    zona: "BARRA",
    clase: "MESA",
    layoutOrder: numeroMesa,
  })),
  ...[1, 2, 3, 4, 5].map((numeroMesa) => ({
    numeroMesa,
    capacidad: 1,
    tipo: "TABURETE",
    zona: "BARRA",
    clase: "PUNTO_BARRA",
    layoutOrder: 100 + numeroMesa,
  })),
];

const productos = [
  { nombre: "Pan de cristal", precio: 350, destino: "COCINA", categoria: "ENTRANTE" },
  { nombre: "Tartar de atún", precio: 1650, destino: "COCINA", categoria: "ENTRANTE" },
  { nombre: "Burrata", precio: 1400, destino: "COCINA", categoria: "ENTRANTE" },
  { nombre: "Entrecot", precio: 2800, destino: "COCINA", categoria: "PRINCIPAL" },
  { nombre: "Lubina a la brasa", precio: 2450, destino: "COCINA", categoria: "PRINCIPAL" },
  { nombre: "Risotto de setas", precio: 1800, destino: "COCINA", categoria: "PRINCIPAL" },
  { nombre: "Tarta de queso", precio: 750, destino: "COCINA", categoria: "POSTRE" },
  { nombre: "Espresso", precio: 180, destino: "BARRA", categoria: "CAFE" },
  { nombre: "Vermut", precio: 450, destino: "BARRA", categoria: "COPA" },
  { nombre: "Copa de albariño", precio: 520, destino: "BARRA", categoria: "VINO" },
  { nombre: "Agua con gas", precio: 280, destino: "BARRA", categoria: "BEBIDA" },
  { nombre: "Negroni", precio: 900, destino: "BARRA", categoria: "COPA" },
];

const promos = [
  { codigo: "STAFF10", tipo: "PORCENTAJE", valor: 10 },
  { codigo: "MESA5", tipo: "FIJO", valor: 500 },
  { codigo: "INVITADO", tipo: "PORCENTAJE", valor: 15 },
];

const empleados = [
  { codigo: "0", nombre: "Gerente", rol: "GERENTE" },
  { codigo: "1", nombre: "Responsable", rol: "ENCARGADO" },
  { codigo: "2", nombre: "Camareros", rol: "CAMARERO" },
  { codigo: "3", nombre: "Lucía Ferrer", rol: "GERENTE" },
  { codigo: "4", nombre: "Marcos Peña", rol: "ENCARGADO" },
  { codigo: "5", nombre: "Ana Ruiz", rol: "CAMARERO" },
  { codigo: "6", nombre: "Diego Salas", rol: "CAMARERO" },
  { codigo: "7", nombre: "Nora Vidal", rol: "CAMARERO" },
  // Plantilla ficticia de la Fase 3. El rol va explícito para que la demo
  // cubra los tres niveles de permiso con varias personas por nivel.
  { codigo: "8", nombre: "Elena Vargas", rol: "GERENTE" },
  { codigo: "9", nombre: "Raúl Domínguez", rol: "ENCARGADO" },
  { codigo: "10", nombre: "Carmen Ortiz", rol: "CAMARERO" },
  { codigo: "11", nombre: "Iván Serrano", rol: "CAMARERO" },
  { codigo: "12", nombre: "Paula Méndez", rol: "CAMARERO" },
  { codigo: "13", nombre: "Hugo Navarro", rol: "CAMARERO" },
] as const;

async function main(): Promise<void> {
  for (const mesa of mesas) {
    await prisma.mesa.upsert({
      where: {
        zona_clase_numeroMesa: {
          zona: mesa.zona,
          clase: mesa.clase,
          numeroMesa: mesa.numeroMesa,
        },
      },
      update: {
        capacidad: mesa.capacidad,
        tipo: mesa.tipo,
        layoutOrder: mesa.layoutOrder,
      },
      create: mesa,
    });
  }

  for (const producto of productos) {
    const existing = await prisma.producto.findFirst({ where: { nombre: producto.nombre } });
    if (existing) {
      await prisma.producto.update({
        where: { id: existing.id },
        data: producto,
      });
    } else {
      await prisma.producto.create({ data: producto });
    }
  }

  for (const promo of promos) {
    await prisma.promoCodigo.upsert({
      where: { codigo: promo.codigo },
      update: { tipo: promo.tipo, valor: promo.valor, activo: true },
      create: promo,
    });
  }

  const legacyManager = await prisma.usuario.findUnique({
    where: { email: "gerente@alfred.local" },
  });
  const zeroExists = await prisma.usuario.findUnique({
    where: { email: "0@alfred.local" },
  });

  if (legacyManager && !zeroExists) {
    await prisma.usuario.update({
      where: { id: legacyManager.id },
      data: { email: "0@alfred.local", nombre: "Gerente", rol: "GERENTE", activo: true },
    });
  }

  for (const empleado of empleados) {
    const email = `${empleado.codigo}@alfred.local`;
    const existing = await prisma.usuario.findUnique({ where: { email } });

    if (existing) {
      await prisma.usuario.update({
        where: { id: existing.id },
        data: { codigo: empleado.codigo, nombre: empleado.nombre, rol: empleado.rol, activo: true },
      });
      continue;
    }

    await prisma.usuario.create({
      data: {
        codigo: empleado.codigo,
        nombre: empleado.nombre,
        email,
        passwordHash: await hashPassword(`ALFRED-EMPLEADO-${empleado.codigo}`),
        rol: empleado.rol,
      },
    });
    console.log(`Empleado creado: código ${empleado.codigo} · ${empleado.nombre} · ${empleado.rol}`);
  }

  const openCount = await prisma.servicio.count({ where: { estado: "ABIERTA" } });
  if (openCount === 0) {
    const comedor2 = await prisma.mesa.findUniqueOrThrow({
      where: { zona_clase_numeroMesa: { zona: "RESTAURANTE", clase: "MESA", numeroMesa: 2 } },
    });
    const terraza1 = await prisma.mesa.findUniqueOrThrow({
      where: { zona_clase_numeroMesa: { zona: "TERRAZA", clase: "MESA", numeroMesa: 1 } },
    });
    const punto1 = await prisma.mesa.findUniqueOrThrow({
      where: { zona_clase_numeroMesa: { zona: "BARRA", clase: "PUNTO_BARRA", numeroMesa: 1 } },
    });
    const tartar = await prisma.producto.findFirstOrThrow({ where: { nombre: "Tartar de atún" } });
    const entrecot = await prisma.producto.findFirstOrThrow({ where: { nombre: "Entrecot" } });
    const vermut = await prisma.producto.findFirstOrThrow({ where: { nombre: "Vermut" } });
    const negroni = await prisma.producto.findFirstOrThrow({ where: { nombre: "Negroni" } });
    const burrata = await prisma.producto.findFirstOrThrow({ where: { nombre: "Burrata" } });
    const risotto = await prisma.producto.findFirstOrThrow({ where: { nombre: "Risotto de setas" } });

    const now = Date.now();

    await prisma.servicio.create({
      data: {
        pax: 2,
        origen: "WALK_IN",
        openedAt: new Date(now - 8 * 60 * 1000),
        mesas: { create: { mesaId: comedor2.id } },
        eventos: { create: { tipo: "APERTURA", detalle: "Walk-in 2 pax" } },
        lineas: {
          create: [
            {
              productoId: tartar.id,
              cantidad: 1,
              numeroAsiento: 1,
              esCompartido: false,
              precioUnitario: tartar.precio,
              estado: "CALLED",
              calledAt: new Date(now - 6 * 60 * 1000),
            },
            {
              productoId: entrecot.id,
              cantidad: 1,
              numeroAsiento: 2,
              esCompartido: false,
              precioUnitario: entrecot.precio,
              estado: "PENDIENTE",
            },
            {
              productoId: vermut.id,
              cantidad: 2,
              numeroAsiento: null,
              esCompartido: true,
              precioUnitario: vermut.precio,
              estado: "READY",
              calledAt: new Date(now - 7 * 60 * 1000),
            },
          ],
        },
      },
    });

    await prisma.servicio.create({
      data: {
        pax: 6,
        origen: "WALK_IN",
        openedAt: new Date(now - 16 * 60 * 1000),
        mesas: { create: { mesaId: terraza1.id } },
        eventos: { create: { tipo: "APERTURA", detalle: "Grupo 6 pax" } },
        lineas: {
          create: [
            {
              productoId: burrata.id,
              cantidad: 2,
              numeroAsiento: null,
              esCompartido: true,
              precioUnitario: burrata.precio,
              estado: "CALLED",
              calledAt: new Date(now - 12 * 60 * 1000),
            },
            {
              productoId: risotto.id,
              cantidad: 3,
              numeroAsiento: 1,
              esCompartido: false,
              precioUnitario: risotto.precio,
              estado: "PENDIENTE",
            },
          ],
        },
      },
    });

    await prisma.servicio.create({
      data: {
        pax: 1,
        origen: "WALK_IN",
        openedAt: new Date(now - 22 * 60 * 1000),
        mesas: { create: { mesaId: punto1.id } },
        eventos: { create: { tipo: "APERTURA", detalle: "Barra punto 1" } },
        lineas: {
          create: [
            {
              productoId: negroni.id,
              cantidad: 1,
              numeroAsiento: 1,
              esCompartido: false,
              precioUnitario: negroni.precio,
              estado: "READY",
              calledAt: new Date(now - 20 * 60 * 1000),
            },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
