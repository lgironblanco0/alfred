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
};

function cardSize(pax: number, clase: string): string {
  if (clase === "PUNTO_BARRA") {
    return "min-w-[112px] min-h-[92px] px-3 py-3";
  }
  if (pax <= 2) return "min-w-[128px] min-h-[108px] px-4 py-3";
  if (pax <= 4) return "min-w-[168px] min-h-[132px] px-4 py-4";
  if (pax <= 6) return "min-w-[220px] min-h-[160px] px-5 py-4";
  return "min-w-[268px] min-h-[188px] px-5 py-5";
}

export function TableCard({
  mesa,
  selected,
  mergeSelected,
  mergeMode,
  now,
  onSelect,
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
      className={`group relative flex min-h-[110px] flex-col justify-between rounded-2xl border text-left transition duration-200 ${cardSize(pax, mesa.clase)} ${
        isDragging ? "opacity-70" : ""
      } ${
        selected
          ? "border-accent ring-2 ring-accent/40"
          : mergeSelected
            ? "border-alert ring-1 ring-alert/40"
            : servicio
              ? "border-transparent bg-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.45)] hover:bg-neutral-850"
              : "border-line bg-panel/60 hover:bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className={`text-[18px] font-bold tracking-tight ${servicio ? "text-ink" : "text-soft"}`}>
            {mesaTitulo}
          </span>
          {servicio ? (
            <span className="mt-0.5 text-[11px] text-mute">{servicio.pax} pax</span>
          ) : (
            <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-mute">Libre</span>
          )}
        </div>
        {servicio ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
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
      <div className="mt-3 flex items-end justify-between">
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
          <span className="text-[11px] text-subtle">Sin servicio</span>
        )}
      </div>
    </button>
  );
}
