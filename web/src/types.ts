export type MesaZona = "RESTAURANTE" | "TERRAZA" | "BARRA";
export type MesaClase = "MESA" | "PUNTO_BARRA";
export type LineaEstado = "PENDIENTE" | "CALLED" | "READY" | "PAID" | "ANULADO";
export type MetodoPago = "EFECTIVO" | "TARJETA";
export type Rol = "CAMARERO" | "ENCARGADO" | "GERENTE";

export type Linea = {
  id: number;
  productoId: number;
  nombre: string;
  destino: string;
  categoria: string;
  cantidad: number;
  numeroAsiento: number | null;
  esCompartido: boolean;
  estado: LineaEstado;
  motivoAnulacion: string | null;
  precioUnitario: number;
  createdAt: string;
  calledAt: string | null;
};

export type Servicio = {
  id: number;
  estado: string;
  pax: number;
  origen: string;
  openedAt: string;
  closedAt: string | null;
  descuentoCodigo: string | null;
  descuentoTipo: string | null;
  descuentoValor: number | null;
  splitModo: string;
  mesaIds: number[];
  mesaLabels: string[];
  metodoPago: MetodoPago | null;
  lineas: Linea[];
  eventos: Array<{
    id: number;
    tipo: string;
    detalle: string;
    createdAt: string;
    actor: { id: number; nombre: string } | null;
  }>;
  subtotal: number;
  discount: number;
  total: number;
};

export type Mesa = {
  id: number;
  numeroMesa: number;
  capacidad: number;
  tipo: string;
  zona: MesaZona;
  clase: MesaClase;
  layoutOrder: number;
  label: string;
  servicio: Servicio | null;
};

export type Producto = {
  id: number;
  nombre: string;
  precio: number;
  destino: string;
  categoria: string;
};

export type Promo = {
  codigo: string;
  tipo: string;
  valor: number;
};

export type Usuario = {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
};

export type Empleado = Usuario & {
  createdAt: string;
};

export type SesionCaja = {
  id: number;
  estado: "ABIERTA" | "CERRADA";
  fondoInicial: number;
  abiertaAt: string;
  abiertaPor: { id: number; nombre: string } | null;
  cerradaAt: string | null;
  cerradaPor: { id: number; nombre: string } | null;
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  notas: string | null;
};

export type ResumenCaja = {
  ventasEfectivo: number;
  ventasTarjeta: number;
  totalCobrado: number;
  numeroCobros: number;
  efectivoEsperado: number;
};

export type Caja = {
  sesion: SesionCaja | null;
  resumen: ResumenCaja;
};

export type HistoricoPage = {
  servicios: Servicio[];
  total: number;
  limit: number;
  offset: number;
};

export type LoginResponse = {
  token: string;
  expiresIn: string;
  usuario: Usuario;
};

export type Sala = {
  mesas: Mesa[];
  productos: Producto[];
  promos: Promo[];
};
