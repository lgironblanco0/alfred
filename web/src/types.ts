export type MesaZona = "RESTAURANTE" | "TERRAZA" | "BARRA";
export type MesaClase = "MESA" | "PUNTO_BARRA";
export type LineaEstado = "PENDIENTE" | "CALLED" | "READY" | "PAID" | "ANULADO";

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
  nombre: string;
  email: string;
  rol: "CAMARERO" | "ENCARGADO" | "GERENTE";
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
