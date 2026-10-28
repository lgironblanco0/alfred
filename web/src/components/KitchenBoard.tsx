import { elapsedMinutes, formatTimer, timerTone } from "../lib/format";
import { estacionDeLinea } from "../lib/estacion";
import type { Linea, Sala } from "../types";

type Destino = "COCINA" | "BARRA";

type Ticket = {
  linea: Linea;
  servicioId: number;
  mesaLabel: string;
};

type KitchenBoardProps = {
  sala: Sala;
  destino: Destino;
  now: number;
  busy: boolean;
  onReady: (lineaId: number) => void;
};

const toneClass: Record<"ok" | "warn" | "alert", string> = {
  ok: "text-ok",
  warn: "text-warn",
  alert: "text-alert",
};

const estadoLabel: Record<string, string> = {
  CALLED: "En preparación",
  READY: "Listo",
};

function mesaNombre(label: string): string {
  return label
    .split(" + ")
    .map((part) => {
      if (/^mesa\b/i.test(part) || /^barra\b/i.test(part)) return part;
      if (/^\d+$/.test(part)) return `Mesa ${part}`;
      return `Mesa ${part}`;
    })
    .join(" + ");
}

function asientoNombre(linea: Linea): string {
  if (linea.esCompartido || linea.numeroAsiento == null) {
    return "Compartido";
  }
  return `Asiento ${linea.numeroAsiento}`;
}

function collect(sala: Sala, destino: Destino): Ticket[] {
  const tickets = new Map<number, Ticket>();

  for (const mesa of sala.mesas) {
    const servicio = mesa.servicio;
    if (!servicio) continue;

    for (const linea of servicio.lineas) {
      if (linea.estado !== "CALLED" && linea.estado !== "READY") continue;
      if (estacionDeLinea(linea) !== destino) continue;
      if (tickets.has(linea.id)) continue;
      tickets.set(linea.id, {
        linea,
        servicioId: servicio.id,
        mesaLabel: servicio.mesaLabels.join(" + "),
      });
    }
  }

  return [...tickets.values()];
}

function sortTickets(a: Ticket, b: Ticket): number {
  if (a.linea.estado !== b.linea.estado) {
    return a.linea.estado === "CALLED" ? -1 : 1;
  }
  const aTime = a.linea.calledAt ?? a.linea.createdAt;
  const bTime = b.linea.calledAt ?? b.linea.createdAt;
  return new Date(aTime).getTime() - new Date(bTime).getTime();
}

export function KitchenBoard({ sala, destino, now, busy, onReady }: KitchenBoardProps) {
  const tickets = collect(sala, destino).sort(sortTickets);
  const inProgress = tickets.filter((ticket) => ticket.linea.estado === "CALLED");
  const ready = tickets.filter((ticket) => ticket.linea.estado === "READY");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">
            {destino === "COCINA" ? "Cocina" : "Barra"}
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">Comandas en curso</h1>
          <p className="mt-1 text-[14px] text-mute">
            {inProgress.length} en preparación · {ready.length} listas
          </p>
        </div>
        <p className="text-[12px] text-subtle">Ordenadas de más antigua a más reciente</p>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-line text-[15px] text-subtle">
          No hay comandas para {destino === "COCINA" ? "cocina" : "barra"}.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <Section title="En preparación" tickets={inProgress} now={now} busy={busy} onReady={onReady} />
          <Section title="Listas" tickets={ready} now={now} busy={busy} onReady={onReady} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tickets,
  now,
  busy,
  onReady,
}: {
  title: string;
  tickets: Ticket[];
  now: number;
  busy: boolean;
  onReady: (lineaId: number) => void;
}) {
  if (tickets.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-mute">
        {title} ({tickets.length})
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-sunken">
        {tickets.map(({ linea, servicioId, mesaLabel }) => {
          const minutes = elapsedMinutes(linea.calledAt ?? linea.createdAt, now);
          return (
            <li
              key={linea.id}
              className="flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5"
            >
              <span className={`w-14 shrink-0 text-[15px] font-semibold ${toneClass[timerTone(minutes)]}`}>
                {formatTimer(minutes)}
              </span>
              <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                <p className="text-[15px] font-semibold">{mesaNombre(mesaLabel)}</p>
                <p className="text-[13px] text-soft">{asientoNombre(linea)}</p>
              </div>
              <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
                <p className="truncate text-[16px] font-semibold tracking-tight">
                  {linea.cantidad} × {linea.nombre}
                </p>
                <p className="text-[12px] text-mute">Servicio {servicioId}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-soft">
                {estadoLabel[linea.estado] ?? linea.estado}
              </span>
              {linea.estado === "CALLED" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReady(linea.id)}
                  className="w-full shrink-0 rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-on-accent disabled:opacity-40 sm:w-auto"
                >
                  Marcar listo
                </button>
              ) : (
                <span className="w-full shrink-0 text-right text-[12px] text-ok sm:w-[104px]">Listo</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
