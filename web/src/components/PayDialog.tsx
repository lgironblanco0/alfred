import { useId, useState } from "react";
import { useModalFocus } from "../lib/useModalFocus";
import type { MetodoPago } from "../types";

type PayDialogProps = {
  onCancel: () => void;
  onConfirm: (metodoPago: MetodoPago) => void;
};

/**
 * Cobro con método de pago explícito (G-4). El efectivo es la opción segura
 * por defecto para que el arqueo cuadre aunque el usuario no toque el selector.
 */
export function PayDialog({ onCancel, onConfirm }: PayDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const panelRef = useModalFocus<HTMLDivElement>(onCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-[28px] border border-line bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
          Cobrar cuenta
        </h2>
        <p id={bodyId} className="mt-2 text-[15px] leading-6 text-soft">
          Se marca el servicio como pagado y la mesa queda libre. Indica cómo se ha cobrado para
          que el arqueo de caja sea correcto.
        </p>

        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium text-soft">Método de pago</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["EFECTIVO", "TARJETA"] as const).map((metodo) => (
              <label
                key={metodo}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-[15px] ${
                  metodoPago === metodo
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-line bg-white/5 text-soft"
                }`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  value={metodo}
                  checked={metodoPago === metodo}
                  onChange={() => setMetodoPago(metodo)}
                  className="accent-current"
                />
                {metodo === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            data-autofocus
            className="rounded-full px-4 py-2 text-[15px] text-soft hover:bg-white/5"
            onClick={onCancel}
          >
            Volver
          </button>
          <button
            type="button"
            className="rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-on-accent"
            onClick={() => onConfirm(metodoPago)}
          >
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
}
