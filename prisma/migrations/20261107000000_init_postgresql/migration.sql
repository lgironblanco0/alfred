-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'CAMARERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" SERIAL NOT NULL,
    "numeroMesa" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CUADRADA',
    "zona" TEXT NOT NULL DEFAULT 'RESTAURANTE',
    "clase" TEXT NOT NULL DEFAULT 'MESA',
    "layoutOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "mesaId" INTEGER,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "numPersonas" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aceptaPolitica" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "destino" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "categoria" TEXT NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoComanda" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "numeroAsiento" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsientoComanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "pax" INTEGER NOT NULL,
    "origen" TEXT NOT NULL DEFAULT 'WALK_IN',
    "modoAsientos" TEXT NOT NULL DEFAULT 'POR_ASIENTO',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "descuentoCodigo" TEXT,
    "descuentoTipo" TEXT,
    "descuentoValor" INTEGER,
    "splitModo" TEXT NOT NULL DEFAULT 'NINGUNO',
    "metodoPago" TEXT,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "importe" INTEGER NOT NULL,
    "propina" INTEGER NOT NULL DEFAULT 0,
    "recibido" INTEGER,
    "cambio" INTEGER,
    "concepto" TEXT,
    "idempotencyKey" TEXT,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioMesa" (
    "servicioId" INTEGER NOT NULL,
    "mesaId" INTEGER NOT NULL,

    CONSTRAINT "ServicioMesa_pkey" PRIMARY KEY ("servicioId","mesaId")
);

-- CreateTable
CREATE TABLE "LineaPedido" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "mesaId" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "numeroAsiento" INTEGER,
    "esCompartido" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivoAnulacion" TEXT,
    "notas" TEXT,
    "precioUnitario" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),

    CONSTRAINT "LineaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCodigo" (
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PromoCodigo_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "EventoServicio" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionCaja" (
    "id" SERIAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "fondoInicial" INTEGER NOT NULL DEFAULT 0,
    "abiertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abiertaPorId" INTEGER,
    "cerradaAt" TIMESTAMP(3),
    "cerradaPorId" INTEGER,
    "efectivoEsperado" INTEGER,
    "efectivoContado" INTEGER,
    "diferencia" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesionCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigo_key" ON "Usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_zona_clase_numeroMesa_key" ON "Mesa"("zona", "clase", "numeroMesa");

-- CreateIndex
CREATE INDEX "Pago_servicioId_idx" ON "Pago"("servicioId");

-- CreateIndex
CREATE INDEX "Pago_actorId_idx" ON "Pago"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_servicioId_idempotencyKey_key" ON "Pago"("servicioId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "EventoServicio_actorId_idx" ON "EventoServicio"("actorId");

-- CreateIndex
CREATE INDEX "SesionCaja_estado_idx" ON "SesionCaja"("estado");

-- CreateIndex
CREATE INDEX "SesionCaja_abiertaAt_idx" ON "SesionCaja"("abiertaAt");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComanda" ADD CONSTRAINT "AsientoComanda_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoComanda" ADD CONSTRAINT "AsientoComanda_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioMesa" ADD CONSTRAINT "ServicioMesa_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioMesa" ADD CONSTRAINT "ServicioMesa_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoServicio" ADD CONSTRAINT "EventoServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoServicio" ADD CONSTRAINT "EventoServicio_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionCaja" ADD CONSTRAINT "SesionCaja_abiertaPorId_fkey" FOREIGN KEY ("abiertaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionCaja" ADD CONSTRAINT "SesionCaja_cerradaPorId_fkey" FOREIGN KEY ("cerradaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

