import { useId, useMemo, useState } from "react";
import { money, splitPreview } from "../lib/format";
import { useModalFocus } from "../lib/useModalFocus";
import type { MetodoPago, Servicio } from "../types";

type PayBody = {
  idempotencyKey?: string;
  metodoPago?: MetodoPago;
  efectivoEntregado?: number;
  importe?: number;
  propina?: number;
  concepto?: string;
  pagos?: Array<{
    metodoPago: MetodoPago;
    importe: number;
    propina?: number;
    recibido?: number;
    concepto?: string;
  }>;
};

type PayDialogProps = {
  servicio: Servicio;
  onCancel: () => void;
  onConfirm: (body: PayBody) => void;
};

type ModoCobro = "TODO" | "POR_ASIENTO" | "IMPORTE";

export function PayDialog({ servicio, onCancel, onConfirm }: PayDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useModalFocus<HTMLDivElement>(onCancel);

  const total = servicio.total;
  const pagado = servicio.pagado ?? 0;
  const saldo = servicio.saldo ?? Math.max(0, total - pagado);
  const split = useMemo(() => splitPreview(servicio), [servicio]);

  const [modo, setModo] = useState<ModoCobro>("TODO");
  const [asientoSel, setAsientoSel] = useState<string>(split[0]?.label ?? "Todo");
  const [importeInput, setImporteInput] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [efectivoInput, setEfectivoInput] = useState("");
  const [propina, setPropina] = useState(0);
  const [customPropina, setCustomPropina] = useState("");
  const [pagosMixtos, setPagosMixtos] = useState<
    Array<{ metodoPago: MetodoPago; importe: number; propina: number; recibido?: number; concepto: string }>
  >([]);

  const importeCents = useMemo(() => {
    const normalized = importeInput.replace(",", ".");
    if (normalized === "") return null;
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.round(parsed * 100));
  }, [importeInput]);

  const importeAPagar =
    modo === "TODO"
      ? saldo
      : modo === "POR_ASIENTO"
        ? split.find((s) => s.label === asientoSel)?.amount ?? saldo
        : importeCents ?? 0;

  const totalConPropina = importeAPagar + propina;
  const efectivoCents = useMemo(() => {
    const normalized = efectivoInput.replace(",", ".");
    if (normalized === "") return null;
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
  }, [efectivoInput]);

  const cambio = metodoPago === "EFECTIVO" && efectivoCents !== null ? Math.max(0, efectivoCents - totalConPropina) : 0;
  const suficiente = metodoPago === "EFECTIVO" && efectivoCents !== null ? efectivoCents >= totalConPropina : true;

  function addAlcancia(amount: number) {
    setPropina((p) => p + amount);
  }

  function setPropinaPct(pct: number) {
    setPropina(Math.round((importeAPagar * pct) / 100));
  }

  function agregarPagoMixto() {
    if (importeAPagar <= 0) return;
    if (metodoPago === "EFECTIVO" && efectivoCents !== null && efectivoCents < totalConPropina) return;
    setPagosMixtos((prev) => [
      ...prev,
      {
        metodoPago,
        importe: importeAPagar,
        propina,
        recibido: metodoPago === "EFECTIVO" ? efectivoCents ?? undefined : undefined,
        concepto: modo === "POR_ASIENTO" ? asientoSel : modo === "IMPORTE" ? "Cobro por importe" : "Cobro por partes",
      },
    ]);
    setPropina(0);
    setEfectivoInput("");
    setCustomPropina("");
  }

  const sumaMixtos = pagosMixtos.reduce((s, p) => s + p.importe + p.propina, 0);
  const pendienteMixto = Math.max(0, saldo - sumaMixtos);

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
        className="w-full max-w-md rounded-[32px] border border-line bg-panel p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
          Cobrar cuenta
        </h2>
        <p id={bodyId} className="mt-2 text-[15px] leading-6 text-soft">
          Divide por partes si lo pide la mesa, añade propina con el botón alcancía y cobra en efectivo o tarjeta.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-[20px] border border-line bg-sunken px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Total</p>
            <p className="text-[16px] font-semibold">{money(total)}</p>
          </div>
          <div className="rounded-[20px] border border-line bg-sunken px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Pagado</p>
            <p className="text-[16px] font-semibold">{money(pagado)}</p>
          </div>
          <div className="rounded-[20px] border border-line bg-sunken px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">Saldo</p>
            <p className="text-[16px] font-semibold text-accent">{money(saldo)}</p>
          </div>
          <div className="rounded-[20px] border border-line bg-sunken px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mute">A pagar ahora</p>
            <p className="text-[16px] font-semibold">{money(importeAPagar + propina)}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Dividir cobro</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["TODO", "POR_ASIENTO", "IMPORTE"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`rounded-full px-3 py-1.5 text-[13px] ${modo === m ? "bg-accent text-on-accent" : "bg-white/5 text-soft"}`}
              >
                {m === "TODO" ? "Todo" : m === "POR_ASIENTO" ? "Por asiento" : "Por importe"}
              </button>
            ))}
          </div>
        </div>

        {modo === "POR_ASIENTO" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {split.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setAsientoSel(s.label)}
                className={`rounded-full px-3 py-1.5 text-[13px] ${asientoSel === s.label ? "bg-white/15 text-ink" : "bg-white/5 text-soft"}`}
              >
                {s.label} · {money(s.amount)}
              </button>
            ))}
          </div>
        ) : null}

        {modo === "IMPORTE" ? (
          <div className="mt-3">
            <label className="text-[12px] text-mute">Importe a cobrar (euros)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={importeInput}
              onChange={(event) => setImporteInput(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-canvas px-4 py-2.5 text-[16px]"
            />
          </div>
        ) : null}

        <div className="mt-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-mute">Propina · Alcancía</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => addAlcancia(50)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">+0,50€</button>
            <button type="button" onClick={() => addAlcancia(100)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">+1,00€</button>
            <button type="button" onClick={() => addAlcancia(200)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">+2,00€</button>
            <button type="button" onClick={() => setPropinaPct(5)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">5%</button>
            <button type="button" onClick={() => setPropinaPct(10)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">10%</button>
            <button type="button" onClick={() => setPropina(0)} className="rounded-full bg-white/5 px-3 py-1.5 text-[13px]">Sin propina</button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Propina personalizada €"
              value={customPropina}
              onChange={(event) => {
                setCustomPropina(event.target.value);
                const normalized = event.target.value.replace(",", ".");
                const parsed = Number.parseFloat(normalized);
                if (!Number.isNaN(parsed)) setPropina(Math.max(0, Math.round(parsed * 100)));
              }}
              className="w-full rounded-2xl border border-line bg-canvas px-4 py-2 text-[14px]"
            />
          </div>
          <p className="mt-1 text-[12px] text-mute">Propina actual: {money(propina)}</p>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium text-soft">Método de pago</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["EFECTIVO", "TARJETA"] as const).map((metodo) => (
              <label
                key={metodo}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-[15px] ${
                  metodoPago === metodo ? "border-accent bg-accent/10 text-ink" : "border-line bg-white/5 text-soft"
                }`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  value={metodo}
                  checked={metodoPago === metodo}
                  onChange={() => {
                    setMetodoPago(metodo);
                    if (metodo === "TARJETA") setEfectivoInput("");
                  }}
                  className="accent-current"
                />
                {metodo === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
              </label>
            ))}
          </div>
        </fieldset>

        {metodoPago === "EFECTIVO" ? (
          <div className="mt-4 space-y-2">
            <label className="text-[12px] text-mute">Efectivo entregado</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={efectivoInput}
              onChange={(event) => setEfectivoInput(event.target.value)}
              className="w-full rounded-2xl border border-line bg-canvas px-4 py-2.5 text-[16px]"
            />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-mute">Cambio</span>
              <span className={suficiente ? "text-ok" : "text-alert"}>{money(cambio)}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={importeAPagar <= 0 || (metodoPago === "EFECTIVO" && !suficiente)}
            onClick={agregarPagoMixto}
            className="flex-1 rounded-full bg-white/10 px-4 py-2 text-[14px] disabled:opacity-40"
          >
            Añadir pago por parte
          </button>
        </div>

        {pagosMixtos.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-sunken">
            <div className="border-b border-line px-4 py-2 flex items-center justify-between">
              <p className="text-[12px] uppercase tracking-[0.14em] text-mute">Pagos añadidos</p>
              <p className="text-[12px] text-mute">{money(sumaMixtos)} / {money(saldo)}</p>
            </div>
            <ul className="divide-y divide-line">
              {pagosMixtos.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span className="text-soft">{p.concepto} · {p.metodoPago}</span>
                  <span>{money(p.importe + p.propina)}</span>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 text-[12px] text-mute">Pendiente: {money(pendienteMixto)}</div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-[15px] text-soft hover:bg-white/5" onClick={onCancel}>
            Volver
          </button>
          <button
            type="button"
            disabled={
              pagosMixtos.length > 0
                ? pendienteMixto !== 0
                : importeAPagar <= 0 || (metodoPago === "EFECTIVO" && !suficiente)
            }
            className="rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-on-accent disabled:opacity-40"
            onClick={() => {
              if (pagosMixtos.length > 0) {
                onConfirm({
                  idempotencyKey: crypto.randomUUID(),
                  pagos: pagosMixtos.map((p) => ({
                    metodoPago: p.metodoPago,
                    importe: p.importe,
                    propina: p.propina,
                    recibido: p.recibido,
                    concepto: p.concepto,
                  })),
                });
                return;
              }
              onConfirm({
                idempotencyKey: crypto.randomUUID(),
                metodoPago,
                importe: importeAPagar,
                propina,
                efectivoEntregado: metodoPago === "EFECTIVO" ? efectivoCents ?? undefined : undefined,
                concepto: modo === "POR_ASIENTO" ? asientoSel : modo === "IMPORTE" ? "Cobro por importe" : "Cobro completo",
              });
            }}
          >
            {pagosMixtos.length > 0
              ? pendienteMixto === 0
                ? "Cobrar todo por partes"
                : `Falta ${money(pendienteMixto)}`
              : "Confirmar cobro"}
          </button>
        </div>
      </div>
    </div>
  );
}
