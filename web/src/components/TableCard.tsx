import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { elapsedMinutes, formatTimer, timerTone } from "../lib/format";
import type { Mesa } from "../types";

type TableCardProps = {
  mesa: Mesa;
  selected: boolean;
  mergeSelected: boolean;
  mergeMode: boolean;
  now: number;
  onSelect: (id: number) => void;
  accent: boolean;
};

function cardSize(pax: number, clase: string): string {
  if (clase === "PUNTO_BARRA") {
    return "min-w-[112px] min-h-[96px] px-4 py-4";
  }
  if (pax <= 2) return "min-w-[128px] min-h-[112px] px-5 py-4";
  if (pax <= 4) return "min-w-[168px] min-h-[140px] px-5 py-5";
  if (pax <= 6) return "min-w-[220px] min-h-[168px] px-6 py-5";
  return "min-w-[268px] min-h-[196px] px-6 py-6";
}

export function TableCard({
  mesa,
  selected,
  mergeSelected,
  mergeMode,
  now,
  onSelect,
  accent,
}: TableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mesa.id,
  });
  const servicio = mesa.servicio;
  const pax = servicio?.pax ?? mesa.capacidad;
  const minutes = servicio ? elapsedMinutes(servicio.openedAt, now) : 0;
  const tone = servicio ? timerTone(minutes) : "ok";
  const joined = servicio && servicio.mesaLabels.length > 1 ? servicio.mesaLabels.join(" · ") : mesa.label;

  const mesaNumero = joined.replace(/[^0-9]/g, "") || String(mesa.numeroMesa);
  const mesaTitulo = servicio ? `MESA ${mesaNumero}` : `MESA ${mesaNumero}`;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      data-mesa-label={joined}
      data-mesa-numero={mesaNumero}
      onClick={(event) => {
        event.currentTarget.focus();
        onSelect(mesa.id);
      }}
      className={`group relative flex min-h-[110px] flex-col justify-between rounded-[32px] border text-left transition duration-200 hover:-translate-y-0.5 ${cardSize(pax, mesa.clase)} ${
        isDragging ? "opacity-70" : ""
       } ${
         selected
           ? "border-accent ring-2 ring-accent/40"
          : mergeSelected
            ? "border-alert ring-1 ring-alert/40"
             : accent
                ? "border-accent bg-accent text-on-accent shadow-[0_8px_24px_rgba(163,230,53,0.18)] hover:bg-accent/90"
                : "border-transparent bg-canvas shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:bg-canvas"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
            <span className={`text-[19px] font-bold tracking-tight ${accent ? "text-on-accent" : "text-soft"}`}>
            {mesaTitulo}
          </span>
          {servicio ? (
             <span className={`mt-0.5 text-[11px] ${accent ? "text-on-accent/70" : "text-mute"}`}>{servicio.pax} pax</span>
          ) : (
             <span className={`mt-0.5 text-[11px] uppercase tracking-[0.16em] ${accent ? "text-on-accent/70" : "text-mute"}`}>Libre</span>
          )}
        </div>
        {servicio ? (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${
              tone === "ok"
                ? "bg-ok/15 text-ok"
                : tone === "warn"
                  ? "bg-warn/15 text-warn"
                  : "bg-alert/15 text-alert"
            }`}
          >
            {formatTimer(minutes)}
          </span>
        ) : null}
      </div>
      <div className={`mt-4 flex items-end justify-between rounded-[20px] px-3 py-2 ${accent ? "bg-black/25" : "bg-white/5"}`}>
        {servicio ? (
          <>
            <span className="text-[14px] font-semibold text-ink">{(servicio.total / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ok">
              {mergeMode ? "Unir" : "Activa"}
            </span>
          </>
        ) : mergeMode ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Añadir</span>
        ) : (
           <span className={`text-[11px] ${accent ? "text-black/75" : "text-subtle"}`}>Sin servicio</span>
        )}
      </div>
    </button>
  );
}
