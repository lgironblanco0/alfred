import type { Linea, Producto } from "../types";

export type Estacion = "COCINA" | "BARRA";

const CATEGORIAS_BEBIDA = new Set([
  "BEBIDA",
  "CAFE",
  "COPA",
  "VINO",
  "CERVEZA",
  "REFRESCO",
  "LICOR",
  "ZUMO",
]);

export function estacionDeCategoria(categoria: string): Estacion {
  return CATEGORIAS_BEBIDA.has(categoria.trim().toUpperCase()) ? "BARRA" : "COCINA";
}

export function estacionDeProducto(producto: Producto): Estacion {
  return estacionDeCategoria(producto.categoria);
}

export function estacionDeLinea(linea: Linea): Estacion {
  return estacionDeCategoria(linea.categoria);
}
