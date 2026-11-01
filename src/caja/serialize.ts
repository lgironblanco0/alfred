import type { SesionCaja } from "@prisma/client";

type SesionWithActors = SesionCaja & {
  abiertaPor?: { id: number; nombre: string } | null;
  cerradaPor?: { id: number; nombre: string } | null;
};

export function serializeSesionCaja(sesion: SesionWithActors) {
  return {
    id: sesion.id,
    estado: sesion.estado,
    fondoInicial: sesion.fondoInicial,
    abiertaAt: sesion.abiertaAt.toISOString(),
    abiertaPor: sesion.abiertaPor
      ? { id: sesion.abiertaPor.id, nombre: sesion.abiertaPor.nombre }
      : null,
    cerradaAt: sesion.cerradaAt?.toISOString() ?? null,
    cerradaPor: sesion.cerradaPor
      ? { id: sesion.cerradaPor.id, nombre: sesion.cerradaPor.nombre }
      : null,
    efectivoEsperado: sesion.efectivoEsperado,
    efectivoContado: sesion.efectivoContado,
    diferencia: sesion.diferencia,
    notas: sesion.notas,
  };
}
