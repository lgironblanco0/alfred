import { useId, useMemo, useState } from "react";
import { useModalFocus } from "../lib/useModalFocus";
import type { Mesa, MesaZona } from "../types";

const zones: Array<{ id: MesaZona; label: string }> = [
  { id: "RESTAURANTE", label: "Comedor" },
  { id: "TERRAZA", label: "Terraza" },
  { id: "BARRA", label: "Barra" },
];

type WalkInModalProps = {
  mesas: Mesa[];
  onClose: () => void;
  onSubmit: (input: {
    mesaId?: number;
    zona?: string;
    clase?: string;
    pax: number;
    createTable?: boolean;
  }) => Promise<void>;
};

export function WalkInModal({ mesas, onClose, onSubmit }: WalkInModalProps) {
  const [zona, setZona] = useState<MesaZona>("RESTAURANTE");
  const [mesaId, setMesaId] = useState<number | "new" | "">("");
  const [pax, setPax] = useState(2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const mesaIdField = useId();
  const paxId = useId();
  const errorId = useId();
  const panelRef = useModalFocus<HTMLFormElement>(onClose);

  const libres = useMemo(
    () => mesas.filter((mesa) => mesa.zona === zona && !mesa.servicio),
    [mesas, zona],
  );

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (mesaId === "new") {
        await onSubmit({
          createTable: true,
          zona,
          clase: zona === "BARRA" ? "MESA" : "MESA",
          pax,
        });
      } else if (typeof mesaId === "number") {
        await onSubmit({ mesaId, pax });
      } else {
        setError("Elige una mesa libre o crea una nueva");
        setPending(false);
        return;
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo abrir");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-panel p-6"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
          Walk-in
        </h2>
        <p id={descriptionId} className="mt-1 text-[14px] text-mute">
          Abre un servicio sin reserva previa.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {zones.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={zona === item.id}
              onClick={() => {
                setZona(item.id);
                setMesaId("");
              }}
              className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                zona === item.id ? "bg-accent text-on-accent" : "bg-white/5 text-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label
          htmlFor={mesaIdField}
          className="mt-5 block text-[12px] font-medium uppercase tracking-[0.14em] text-mute"
        >
          Mesa
        </label>
        <select
          id={mesaIdField}
          data-autofocus
          className="mt-2 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-[15px]"
          value={mesaId}
          onChange={(event) => {
            const value = event.target.value;
            setMesaId(value === "new" || value === "" ? value : Number(value));
          }}
        >
          <option value="">Seleccionar</option>
          {libres.map((mesa) => (
            <option key={mesa.id} value={mesa.id}>
              {mesa.label} · {mesa.capacidad} pax
            </option>
          ))}
          <option value="new">Crear mesa nueva en {zona.toLowerCase()}</option>
        </select>

        <label
          htmlFor={paxId}
          className="mt-5 block text-[12px] font-medium uppercase tracking-[0.14em] text-mute"
        >
          Comensales
        </label>
        <input
          id={paxId}
          type="number"
          min={1}
          max={20}
          value={pax}
          onChange={(event) => setPax(Number(event.target.value))}
          className="mt-2 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-[15px]"
        />

        {error ? (
          <p id={errorId} role="alert" className="mt-3 text-[13px] text-alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-soft" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-on-accent disabled:opacity-60"
          >
            Abrir mesa
          </button>
        </div>
      </form>
    </div>
  );
}
