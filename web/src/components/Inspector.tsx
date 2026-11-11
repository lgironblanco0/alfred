import { useEffect, useId, useMemo, useState } from "react";
import { estacionDeProducto } from "../lib/estacion";
import { clockTime, lineSeatLabel, money, splitPreview } from "../lib/format";
import { useModalFocus } from "../lib/useModalFocus";
import type { Linea, Mesa, Producto } from "../types";

const reasons = ["Error al tomar nota", "El cliente cambió de opinión", "Mesa equivocada", "Producto agotado"];

type Destino = "COCINA" | "BARRA";

type InspectorProps = {
  mesa: Mesa | null;
  productos: Producto[];
  busy: boolean;
  onClose: () => void;
  onExpand: (pax: number) => void;
  onCall: () => void;
  onReady: (lineaId: number) => void;
  onAdd: (input: { productoId: number; numeroAsiento: number | null; esCompartido: boolean }) => void;
  onAnular: (lineaId: number, motivo: string) => Promise<void>;
  onPromo: (codigo: string) => void;
  onSplit: (modo: string) => void;
  onCancel: () => void;
};

function Badge({ estado }: { estado: Linea["estado"] }) {
  const map: Record<string, string> = {
    PENDIENTE: "bg-white/10 text-soft",
    CALLED: "bg-warn/15 text-warn",
    READY: "bg-ok/15 text-ok",
    PAID: "bg-white/10 text-soft",
    ANULADO: "bg-alert/15 text-alert line-through",
  };
  const label = estado === "PENDIENTE" ? "PENDING" : estado;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${map[estado]}`}>{label}</span>;
}

function grupoCategoria(items: Producto[]): Array<{ categoria: string; items: Producto[] }> {
  const groups = new Map<string, Producto[]>();
  for (const item of items) {
    const key = item.categoria || "Otros";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([categoria, productos]) => ({ categoria, items: productos }));
}

export function Inspector({
  mesa,
  productos,
  busy,
  onClose,
  onExpand,
  onCall,
  onReady,
  onAdd,
  onAnular,
  onPromo,
  onSplit,
  onCancel,
}: InspectorProps) {
  const [seat, setSeat] = useState<number | "share" | null>(null);
  const [selectionError, setSelectionError] = useState(false);
  const [promo, setPromo] = useState("");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [destino, setDestino] = useState<Destino>("COCINA");
  const [accountOpen, setAccountOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const paxId = useId();
  const promoId = useId();
  const accountTitleId = useId();
  const removeTitleId = useId();
  const panelRef = useModalFocus<HTMLDivElement>(onClose);
  const accountPanelRef = useModalFocus<HTMLDivElement>(
    () => setAccountOpen(false),
    accountOpen && Boolean(mesa?.servicio),
  );
  const removePanelRef = useModalFocus<HTMLDivElement>(() => setRemoveId(null), Boolean(removeId));

  const servicio = mesa?.servicio ?? null;
  const allActive = servicio?.lineas.filter((linea) => linea.estado !== "ANULADO") ?? [];
  const pending = servicio?.lineas.filter((linea) => linea.estado === "PENDIENTE") ?? [];
  const called = servicio?.lineas.filter((linea) => ["CALLED", "READY", "PAID"].includes(linea.estado)) ?? [];
  const calledCocina = called.filter((linea) => linea.destino === "COCINA");
  const calledBarra = called.filter((linea) => linea.destino === "BARRA");
  const split = servicio ? splitPreview(servicio) : [];

  const sharedLines = useMemo(
    () => allActive.filter((linea) => linea.esCompartido || linea.numeroAsiento == null),
    [allActive],
  );
  const bySeat = useMemo(() => {
    if (!servicio) return new Map<number, Linea[]>();
    const map = new Map<number, Linea[]>();
    for (let seat = 1; seat <= servicio.pax; seat += 1) map.set(seat, []);
    for (const linea of allActive) {
      if (linea.esCompartido || linea.numeroAsiento == null) continue;
      const list = map.get(linea.numeroAsiento) ?? [];
      list.push(linea);
      map.set(linea.numeroAsiento, list);
    }
    return map;
  }, [allActive, servicio]);
  const seatLines = servicio
    ? servicio.lineas.filter(
        (linea) =>
          linea.estado !== "ANULADO" &&
          (seat === "share"
            ? linea.esCompartido || linea.numeroAsiento == null
            : !linea.esCompartido && linea.numeroAsiento === seat),
      )
    : [];
  const seatUnits = seatLines.reduce((sum, linea) => sum + linea.cantidad, 0);
  const seatTotal = seatLines.reduce((sum, linea) => sum + linea.precioUnitario * linea.cantidad, 0);
  const cocina = useMemo(
    () => productos.filter((item) => estacionDeProducto(item) === "COCINA"),
    [productos],
  );
  const barra = useMemo(
    () => productos.filter((item) => estacionDeProducto(item) === "BARRA"),
    [productos],
  );
  const visibles = destino === "COCINA" ? cocina : barra;
  const grupos = useMemo(() => grupoCategoria(visibles), [visibles]);

  function pendingLineFor(productoId: number) {
    return pending.find(
      (linea) =>
        linea.productoId === productoId &&
        (seat === "share"
          ? linea.esCompartido || linea.numeroAsiento == null
          : seat !== null && !linea.esCompartido && linea.numeroAsiento === seat),
    );
  }

  function selectedLineFor(productoId: number) {
    return seatLines.find((linea) => linea.productoId === productoId);
  }

  useEffect(() => {
    if (seat !== null && seat !== "share" && servicio && seat > servicio.pax) {
      setSeat("share");
    }
  }, [seat, servicio]);

  if (!mesa) return null;

  function addProduct(productoId: number) {
    if (seat === null) {
      setSelectionError(true);
      return;
    }
    setSelectionError(false);
    onAdd({
      productoId,
      numeroAsiento: seat === "share" ? null : seat,
      esCompartido: seat === "share",
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative flex h-[100dvh] w-full max-w-[1320px] flex-col overflow-y-auto rounded-none border border-line bg-panel shadow-2xl sm:h-[94vh] sm:overflow-hidden sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={descriptionId} className="sr-only">
          Comanda, asientos y carta de la mesa seleccionada.
        </p>
        <header className="flex items-start justify-between gap-4 border-b border-line bg-sunken/40 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              aria-label="Volver a las mesas"
              className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[24px] leading-none text-accent transition hover:bg-accent/10"
            >
              ←
            </button>
            <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.16em] text-mute">
              {servicio
                ? `Servicio ${servicio.id}`
                : mesa.zona === "RESTAURANTE"
                  ? "Comedor"
                  : mesa.zona === "TERRAZA"
                    ? "Terraza"
                    : mesa.zona === "COMEDOR_2"
                      ? "Comedor 2"
                      : "Barra"}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-[24px] font-semibold tracking-tight sm:text-[30px]">
              {servicio ? servicio.mesaLabels.join(" + ") : mesa.label}
            </h2>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {servicio ? (
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="rounded-full bg-white/5 px-4 py-2 text-[13px] font-medium text-soft hover:bg-white/10"
              >
                Cuenta · {money(servicio.total)}
              </button>
            ) : null}
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              className="rounded-full bg-white/5 px-4 py-2 text-[13px] font-medium text-soft hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>
        </header>

        <div className="border-b border-line bg-sunken/20 px-5 py-4 sm:px-7 sm:py-5">
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <SeatMap
              compact
              pax={servicio?.pax ?? mesa.capacidad}
              mesaLabel={servicio?.mesaLabels.join(" + ") ?? mesa.label}
              lineas={servicio?.lineas ?? []}
               seat={seat}
               onSelectSeat={(nextSeat) => {
                 setSeat(nextSeat);
                 setSelectionError(false);
               }}
            />
            <div className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-line bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">
                    {seat === "share" ? "Compartido (arriba)" : `Asiento ${seat}`}
                  </h4>
                  <p className="text-[13px] text-soft">
                    {seatUnits} uds · {money(seatTotal)}
                  </p>
                </div>
                {servicio ? (
                  <div className="flex items-center gap-2">
                    <label htmlFor={paxId} className="text-[12px] text-mute">
                      Pax
                    </label>
                    <input
                      id={paxId}
                      type="number"
                      min={1}
                      value={servicio.pax}
                      onChange={(event) => onExpand(Number(event.target.value))}
                      className="w-16 rounded-full border border-line bg-canvas px-3 py-1 text-center text-[14px]"
                    />
                  </div>
                ) : (
                  <p className="rounded-full bg-accent/10 px-3 py-1 text-[12px] text-accent">
                    Mesa libre · el primer producto abre la cuenta
                  </p>
                )}
              </div>
              {seatLines.length === 0 ? (
                <p className="text-[12px] text-subtle">Sin consumiciones todavía en este asiento.</p>
              ) : (
                <ul className="max-h-[64px] space-y-1 overflow-y-auto pr-1">
                  {seatLines.map((linea) => (
                    <li key={linea.id} className="flex justify-between gap-3 text-[12px]">
                      <span className="min-w-0 truncate text-soft">
                        <span className="text-mute">{linea.cantidad}×</span> {linea.nombre}
                      </span>
                      <span className="shrink-0 text-mute">{money(linea.precioUnitario * linea.cantidad)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
                <button
                  type="button"
                  aria-pressed={destino === "COCINA"}
                  onClick={() => setDestino("COCINA")}
                  className={`rounded-full px-4 py-2 text-[14px] font-semibold ${destino === "COCINA" ? "bg-accent text-on-accent" : "text-soft hover:bg-white/5"}`}
                >
                  Comidas ({cocina.length})
                </button>
                <button
                  type="button"
                  aria-pressed={destino === "BARRA"}
                  onClick={() => setDestino("BARRA")}
                  className={`rounded-full px-4 py-2 text-[14px] font-semibold ${destino === "BARRA" ? "bg-accent text-on-accent" : "text-soft hover:bg-white/5"}`}
                >
                  Bebidas ({barra.length})
                </button>
              </div>
              <button
                type="button"
                disabled={busy || !servicio || pending.length === 0}
                onClick={onCall}
                title="Enviar los productos pendientes a cocina y barra"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[14px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true" className="text-[19px]">▤</span>
                Enviar a cocina/barra ({pending.length})
              </button>
              {selectionError ? (
                <p role="alert" className="rounded-xl bg-alert/15 px-3 py-2 text-[12px] font-medium text-alert">
                  Selecciona una silla o «Compartido (arriba)» antes de añadir un producto.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-none overflow-visible sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
          <div
            data-testid="inspector-columns"
            className="grid min-h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            {/* Comanda de la mesa */}
            <section className="order-2 border-b border-line lg:order-1 lg:border-b-0 lg:border-r">
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-mute">Consumos</h3>
                    <p className="mt-1 text-[11px] text-subtle">Agrupados por pedido · compartido arriba</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-5 py-4">
                {servicio ? (
                  <>
                    <div className="rounded-2xl border border-line bg-sunken">
                      <div className="flex items-center justify-between border-b border-line px-4 py-2">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">Compartido</p>
                        <span className="text-[11px] text-subtle">{sharedLines.length} línea(s)</span>
                      </div>
                      {sharedLines.length === 0 ? (
                        <p className="px-4 py-2 text-[12px] text-subtle">Sin consumiciones para compartir.</p>
                      ) : (
                        <ul className="divide-y divide-line">
                          {sharedLines.map((linea) => (
                            <li key={linea.id} className="flex items-center justify-between gap-3 px-4 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-medium">
                                  {linea.nombre} <span className="text-mute">x{linea.cantidad}</span>
                                </p>
                                <p className="text-[11px] text-subtle">{lineSeatLabel(linea)} · {linea.estado}</p>
                              </div>
                              <span className="shrink-0 text-[13px] text-soft">{money(linea.precioUnitario * linea.cantidad)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {Array.from(bySeat.entries()).map(([seat, items]) => (
                      <div key={seat} className="rounded-2xl border border-line bg-sunken">
                        <div className="flex items-center justify-between border-b border-line px-4 py-2">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">Asiento {seat}</p>
                          <span className="text-[11px] text-subtle">{items.length} línea(s)</span>
                        </div>
                        {items.length === 0 ? (
                          <p className="px-4 py-2 text-[12px] text-subtle">Sin consumiciones en este asiento.</p>
                        ) : (
                          <ul className="divide-y divide-line">
                            {items.map((linea) => (
                              <li key={linea.id} className="flex items-center justify-between gap-3 px-4 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-medium">
                                    {linea.nombre} <span className="text-mute">x{linea.cantidad}</span>
                                  </p>
                                  <p className="text-[11px] text-subtle">{lineSeatLabel(linea)} · {linea.estado}</p>
                                </div>
                                <span className="shrink-0 text-[13px] text-soft">{money(linea.precioUnitario * linea.cantidad)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </>
                ) : null}

                <div>
                  <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">
                    Pendientes ({pending.length})
                  </h4>
                  <ItemList
                    items={pending}
                    empty="Nada pendiente para el siguiente pase."
                    onReady={onReady}
                    onAskRemove={setRemoveId}
                  />
                </div>

                <details className="group rounded-2xl border border-line bg-sunken">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">
                      Enviadas ({called.length})
                    </span>
                    <span className="text-[12px] text-subtle group-open:hidden">Desplegar</span>
                    <span className="hidden text-[12px] text-subtle group-open:inline">Ocultar</span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-4 py-3">
                    <div>
                      <p className="mb-2 text-[12px] font-medium text-soft">Cocina</p>
                      <ItemList
                        items={calledCocina}
                        empty="Sin comandas de cocina."
                        onReady={onReady}
                        onAskRemove={setRemoveId}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-[12px] font-medium text-soft">Barra</p>
                      <ItemList
                        items={calledBarra}
                        empty="Sin comandas de barra."
                        onReady={onReady}
                        onAskRemove={setRemoveId}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </section>

            {/* Carta por pantallas */}
            <section className="order-1 lg:order-2">
              <div className="sticky top-0 z-10 border-b border-line bg-panel px-5 py-3">
                <p className="text-[13px] text-soft">
                  Tomando nota para <span className="font-semibold text-accent">{seat === "share" ? "compartido" : `asiento ${seat}`}</span>
                </p>
              </div>

              <div className="px-5 py-4">
                {grupos.length === 0 ? (
                  <p className="text-[13px] text-subtle">No hay productos disponibles en esta sección.</p>
                ) : (
                  <div className="space-y-5">
                    {grupos.map((grupo) => (
                      <div key={grupo.categoria}>
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">{grupo.categoria}</p>
                        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-sunken">
                           {grupo.items.map((item) => (
                             <div
                               key={item.id}
                               className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-white/5"
                             >
                               <button
                                 type="button"
                                 disabled={busy}
                                 onClick={() => addProduct(item.id)}
                                 className="min-w-0 flex-1 text-left disabled:opacity-40"
                               >
                                 <span className="block truncate text-[15px] font-medium">{item.nombre}</span>
                                 <span className="block text-[12px] text-subtle">{grupo.categoria}</span>
                               </button>
                               <span className="flex shrink-0 items-center gap-3">
                                 {selectedLineFor(item.id) ? (
                                   <span
                                     aria-label={`${selectedLineFor(item.id)?.cantidad ?? 0} unidades tomadas`}
                                     className="min-w-7 rounded-full bg-accent/15 px-2 py-1 text-center text-[12px] font-bold text-accent"
                                   >
                                     ×{selectedLineFor(item.id)?.cantidad}
                                   </span>
                                 ) : null}
                                 <span className="text-[14px] text-soft">{money(item.precio)}</span>
                                 {pendingLineFor(item.id) ? (
                                   <button
                                     type="button"
                                     disabled={busy}
                                     aria-label={`Eliminar ${item.nombre} de la comanda`}
                                     title="Eliminar de la comanda"
                                     onClick={() => {
                                       const linea = pendingLineFor(item.id);
                                       if (linea) setRemoveId(linea.id);
                                     }}
                                     className="grid h-8 w-8 place-items-center rounded-full border border-alert/50 text-[20px] font-semibold leading-none text-alert hover:bg-alert/15 disabled:opacity-40"
                                   >
                                     −
                                   </button>
                                 ) : null}
                                 <button
                                   type="button"
                                   disabled={busy}
                                   aria-label={`Añadir ${item.nombre}`}
                                   title={seat === null ? "Selecciona una silla o compartido" : `Añadir ${item.nombre}`}
                                   onClick={() => addProduct(item.id)}
                                   className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-[18px] font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                                 >
                                   +
                                 </button>
                               </span>
                             </div>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>

        {accountOpen && servicio ? (
          <div
            className="absolute inset-0 z-20 flex justify-end bg-black/40"
            onClick={() => setAccountOpen(false)}
          >
            <div
              ref={accountPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={accountTitleId}
              className="flex h-full w-full flex-col border-l border-line bg-panel shadow-2xl sm:w-[380px] sm:max-w-[92%]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h3
                  id={accountTitleId}
                  className="text-[13px] font-semibold uppercase tracking-[0.16em] text-mute"
                >
                  Cuenta
                </h3>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => setAccountOpen(false)}
                  className="rounded-full bg-white/5 px-3 py-1 text-[12px] text-soft hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex gap-2">
                  <label htmlFor={promoId} className="sr-only">
                    Código promocional
                  </label>
                  <input
                    id={promoId}
                    value={promo}
                    onChange={(event) => setPromo(event.target.value.toUpperCase())}
                    placeholder="Código promo"
                    className="min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 py-2 text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => onPromo(promo)}
                    className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium"
                  >
                    Aplicar
                  </button>
                </div>
                {servicio.descuentoCodigo ? (
                  <p className="text-[12px] text-accent">
                    {servicio.descuentoCodigo} · -{money(servicio.discount)}
                  </p>
                ) : (
                  <p className="text-[12px] text-subtle">STAFF10 · MESA5 · INVITADO</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {["NINGUNO", "IGUAL", "ASIENTO"].map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      aria-pressed={servicio.splitModo === modo}
                      onClick={() => onSplit(modo)}
                      className={`rounded-full px-3 py-1 text-[12px] ${
                        servicio.splitModo === modo ? "bg-accent text-on-accent" : "bg-white/5 text-soft"
                      }`}
                    >
                      {modo === "NINGUNO" ? "Única" : modo === "IGUAL" ? "Split igual" : "Por asiento"}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 text-[14px]">
                  <Row label="Subtotal" value={money(servicio.subtotal)} />
                  <Row label="Descuento" value={money(servicio.discount)} />
                  <Row label="Total" value={money(servicio.total)} strong />
                </div>
                 {split.length > 1 ? (
                  <div className="space-y-1 border-t border-line pt-3">
                    {split.map((part) => (
                      <Row key={part.label} label={part.label} value={money(part.amount)} />
                    ))}
                  </div>
                  ) : null}
                 <div className="border-t border-line pt-3">
                   <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">
                     Editar consumos
                   </p>
                   <ul className="space-y-2">
                     {servicio.lineas.filter((linea) => linea.estado !== "ANULADO").map((linea) => (
                       <li key={linea.id} className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2">
                         <div className="min-w-0 flex-1">
                           <p className="truncate text-[13px] font-medium">{linea.nombre} ×{linea.cantidad}</p>
                           <p className="text-[11px] text-subtle">{lineSeatLabel(linea)} · {linea.estado}</p>
                         </div>
                         <button
                           type="button"
                           disabled={busy}
                           aria-label={`Quitar una unidad de ${linea.nombre}`}
                           onClick={() => setRemoveId(linea.id)}
                           className="grid h-7 w-7 place-items-center rounded-full border border-alert/50 text-[18px] text-alert disabled:opacity-40"
                         >−</button>
                         <button
                           type="button"
                           disabled={busy}
                           aria-label={`Añadir una unidad de ${linea.nombre}`}
                           onClick={() => onAdd({ productoId: linea.productoId, numeroAsiento: linea.numeroAsiento, esCompartido: linea.esCompartido })}
                           className="grid h-7 w-7 place-items-center rounded-full bg-accent/20 text-[18px] text-accent disabled:opacity-40"
                         >+</button>
                       </li>
                     ))}
                   </ul>
                 </div>
                 <button
                   type="button"
                   onClick={() => window.print()}
                   className="w-full rounded-full bg-white/10 py-2 text-[13px] font-medium text-soft"
                 >
                   Imprimir resumen / ticket
                 </button>
                <div className="border-t border-line pt-3">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">
                    Historial
                  </p>
                  {servicio.eventos.length === 0 ? (
                    <p className="text-[12px] text-subtle">Sin movimientos registrados.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {servicio.eventos.slice(0, 8).map((evento) => (
                        <li key={evento.id} className="flex gap-2 text-[12px]">
                          <span className="shrink-0 text-subtle">{clockTime(evento.createdAt)}</span>
                          <span className="min-w-0 flex-1 text-soft">
                            {evento.detalle}
                            <span className="text-subtle"> · {evento.actor?.nombre ?? "sin identificar"}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-line bg-sunken px-4 py-3 text-[12px] text-subtle">
                  El cobro se realiza desde <span className="font-semibold text-soft">Caja</span>. Solo Encargado o Gerente pueden cobrar.
                </div>
              </div>
              <div className="border-t border-line p-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full rounded-full bg-alert/15 py-3 text-[14px] font-semibold text-alert"
                >
                  Cancelar / liberar mesa
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {removeId ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setRemoveId(null)}
          >
            <div
              ref={removePanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={removeTitleId}
              className="w-full max-w-md rounded-[24px] border border-line bg-panel p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id={removeTitleId} className="text-[15px] font-semibold">
                Motivo de anulación
              </h3>
              <div className="mt-3 grid gap-2">
                {reasons.map((reason, index) => (
                  <button
                    key={reason}
                    type="button"
                    data-autofocus={index === 0 ? true : undefined}
                       onClick={async () => {
                         await onAnular(removeId, reason);
                         setRemoveId(null);
                       }}
                    className="rounded-2xl bg-white/5 px-4 py-3 text-left text-[14px]"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 w-full py-2 text-[13px] text-mute"
                onClick={() => setRemoveId(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-[16px] font-semibold" : "text-soft"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SeatMap({
  pax,
  mesaLabel,
  lineas,
  seat,
  onSelectSeat,
  compact = false,
}: {
  pax: number;
  mesaLabel: string;
  lineas: Linea[];
  seat: number | "share" | null;
  onSelectSeat: (seat: number | "share") => void;
  compact?: boolean;
}) {
  const active = lineas.filter((linea) => linea.estado !== "ANULADO" && linea.estado !== "PAID");
  const counts = new Map<number, number>();
  let shared = 0;

  for (const linea of active) {
    if (linea.esCompartido || linea.numeroAsiento == null) {
      shared += linea.cantidad;
      continue;
    }
    counts.set(linea.numeroAsiento, (counts.get(linea.numeroAsiento) ?? 0) + linea.cantidad);
  }

  const total = Math.max(1, pax);
  const seats = Array.from({ length: total }, (_, index) => index + 1);
  const radiusX = 40;
  const radiusY = 34;

  return (
    <div className="rounded-2xl border border-line bg-sunken px-3 py-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mute">Mapa de asientos</p>
        <p className="text-[11px] text-subtle">Toca un asiento para apuntar</p>
      </div>

      <div className={`relative mx-auto w-full max-w-[400px] ${compact ? "h-[120px]" : "h-[200px]"}`}>
        <div className="absolute left-1/2 top-1/2 flex h-[40%] w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[22px] border border-line bg-canvas px-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-mute">Mesa</p>
          <p className="truncate text-[19px] font-semibold tracking-tight">{mesaLabel}</p>
          <p className="text-[11px] text-subtle">{pax} pax</p>
        </div>

        {seats.map((value) => {
          const angle = (-90 + (360 / total) * (value - 1)) * (Math.PI / 180);
          const left = 50 + radiusX * Math.cos(angle);
          const top = 50 + radiusY * Math.sin(angle);
          const count = counts.get(value) ?? 0;
          const selected = seat === value;
          const size = total > 12 ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[11px]";

          return (
            <button
              key={value}
              type="button"
              data-compact-target
              aria-pressed={selected}
              aria-label={`Asiento ${value}${count > 0 ? `, ${count} línea(s)` : ", libre"}`}
              onClick={() => onSelectSeat(value)}
              title={`Asiento ${value}${count > 0 ? ` · ${count} línea(s)` : " · libre"}`}
              className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border font-semibold transition ${size} ${
                selected
                  ? "border-accent bg-accent text-on-accent shadow-[0_0_0_3px_rgba(163,230,53,0.2)]"
                  : count > 0
                    ? "border-accent/70 bg-accent/15 text-accent"
                    : "border-line bg-white/5 text-soft hover:bg-white/10"
              }`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {value}
              {count > 0 && !selected ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[9px] font-bold text-on-accent">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <button
          type="button"
          aria-pressed={seat === "share"}
          onClick={() => onSelectSeat("share")}
          className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
            seat === "share" ? "bg-accent text-on-accent" : "bg-white/5 text-soft hover:bg-white/10"
          }`}
        >
          Compartido (arriba){shared > 0 ? ` · ${shared}` : ""}
        </button>
        <div className="flex items-center gap-3 text-[10px] text-subtle">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" /> Seleccionado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warn" /> Con comanda
          </span>
        </div>
      </div>
    </div>
  );
}

function ItemList({
  items,
  empty,
  onReady,
  onAskRemove,
}: {
  items: Linea[];
  empty: string;
  onReady: (id: number) => void;
  onAskRemove: (id: number) => void;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-subtle">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((linea) => (
        <li key={linea.id} className="rounded-2xl border border-line bg-sunken px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                {linea.nombre} <span className="text-mute">x{linea.cantidad}</span>
              </p>
              <p className="mt-1 text-[12px] text-mute">
                {lineSeatLabel(linea)} · {money(linea.precioUnitario * linea.cantidad)}
              </p>
            </div>
            <Badge estado={linea.estado} />
          </div>
          <div className="mt-2 flex gap-2">
            {linea.estado === "CALLED" ? (
              <button
                type="button"
                data-compact-target
                className="text-[12px] font-medium text-ok"
                onClick={() => onReady(linea.id)}
              >
                Marcar READY
              </button>
            ) : null}
            {linea.estado !== "PAID" && linea.estado !== "ANULADO" ? (
              <button
                type="button"
                data-compact-target
                className="text-[12px] font-medium text-alert"
                onClick={() => onAskRemove(linea.id)}
              >
                 🗑 Eliminar
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
