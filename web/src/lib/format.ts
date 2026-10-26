import type { Linea, Servicio } from "../types";

export function money(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function elapsedMinutes(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function timerTone(minutes: number): "ok" | "warn" | "alert" {
  if (minutes < 10) return "ok";
  if (minutes < 20) return "warn";
  return "alert";
}

export function formatTimer(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${rest.toString().padStart(2, "0")}m`;
  }
  return `${rest}m`;
}

export function splitPreview(servicio: Servicio): Array<{ label: string; amount: number }> {
  const active = servicio.lineas.filter((linea) => linea.estado !== "ANULADO");
  if (servicio.splitModo === "IGUAL") {
    const share = Math.round(servicio.total / Math.max(1, servicio.pax));
    return Array.from({ length: servicio.pax }, (_, index) => ({
      label: `Asiento ${index + 1}`,
      amount: index === servicio.pax - 1 ? servicio.total - share * (servicio.pax - 1) : share,
    }));
  }
  if (servicio.splitModo === "ASIENTO") {
    const shared = active.filter((linea) => linea.esCompartido || linea.numeroAsiento == null);
    const sharedTotal = shared.reduce((sum, linea) => sum + linea.precioUnitario * linea.cantidad, 0);
    const sharedShare = Math.round(sharedTotal / Math.max(1, servicio.pax));
    const bySeat = new Map<number, number>();
    for (let seat = 1; seat <= servicio.pax; seat += 1) {
      bySeat.set(seat, sharedShare);
    }
    for (const linea of active) {
      if (!linea.esCompartido && linea.numeroAsiento) {
        bySeat.set(
          linea.numeroAsiento,
          (bySeat.get(linea.numeroAsiento) ?? 0) + linea.precioUnitario * linea.cantidad,
        );
      }
    }
    const raw = [...bySeat.entries()].map(([seat, amount]) => ({ label: `Asiento ${seat}`, amount }));
    const scale = servicio.subtotal === 0 ? 1 : servicio.total / servicio.subtotal;
    return raw.map((row) => ({ ...row, amount: Math.round(row.amount * scale) }));
  }
  return [{ label: "Cuenta única", amount: servicio.total }];
}

export function lineSeatLabel(linea: Linea): string {
  if (linea.esCompartido || linea.numeroAsiento == null) {
    return "Compartir";
  }
  return `Asiento ${linea.numeroAsiento}`;
}
