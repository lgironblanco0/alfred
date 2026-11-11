import { useMemo, useState } from "react";

type Item = {
  id: number;
  nombre: string;
  unidad: "CAJA" | "UNIDAD";
  existencias: number;
};

const INITIAL: Item[] = [
  { id: 1, nombre: "Coca-Cola", unidad: "CAJA", existencias: 5 },
  { id: 2, nombre: "Nestea", unidad: "CAJA", existencias: 5 },
  { id: 3, nombre: "Aquarius limón", unidad: "CAJA", existencias: 5 },
  { id: 4, nombre: "Ron Santa Teresa", unidad: "UNIDAD", existencias: 3 },
  { id: 5, nombre: "Absolut Vodka", unidad: "UNIDAD", existencias: 3 },
  { id: 6, nombre: "Whisky Macallan", unidad: "UNIDAD", existencias: 3 },
];

export function InventoryBoard({ gerente }: { gerente: boolean }) {
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [pedido, setPedido] = useState<Record<number, number>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const lineas = useMemo(
    () =>
      items
        .map((item) => ({ ...item, cantidad: pedido[item.id] ?? 0 }))
        .filter((item) => item.cantidad > 0),
    [items, pedido],
  );

  function cambiar(id: number, delta: number) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setPedido((current) => {
      const next = Math.max(0, Math.min(item.existencias, (current[id] ?? 0) + delta));
      return { ...current, [id]: next };
    });
    setMensaje(null);
  }

  function terminar() {
    if (lineas.length === 0) {
      setMensaje("Añade al menos un artículo al pedido.");
      return;
    }
    const confirmado = window.confirm("¿Has terminado el pedido para recargar la barra? Se descontará del inventario y se imprimirá para el almacén.");
    if (!confirmado) return;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        existencias: item.existencias - (pedido[item.id] ?? 0),
      })),
    );
    window.setTimeout(() => window.print(), 0);
    setPedido({});
    setMensaje("Pedido confirmado. Existencias descontadas e impresión enviada.");
  }

  function reponer(item: Item) {
    const cantidad = Number(window.prompt(`Añadir ${item.unidad.toLowerCase()} de ${item.nombre}`, "1"));
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, existencias: entry.existencias + Math.floor(cantidad) } : entry,
      ),
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Barra</p>
          <h2 className="mt-1 text-[28px] font-semibold tracking-tight">Pedido de inventario</h2>
          <p className="mt-1 text-[14px] text-mute">Selecciona lo que necesitas. El stock se descuenta solo al terminar.</p>
        </div>
        <button type="button" onClick={terminar} className="rounded-full bg-accent px-5 py-3 text-[14px] font-semibold text-on-accent">
          Terminar pedido e imprimir
        </button>
      </header>

      {mensaje ? <p className="rounded-2xl bg-accent/10 px-4 py-3 text-[14px] text-accent">{mensaje}</p> : null}

      <section className="rounded-[24px] border border-line bg-sunken p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mute">Pedido actual</h3>
        {lineas.length === 0 ? (
          <p className="mt-2 text-[13px] text-subtle">Todavía no has seleccionado artículos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {lineas.map((item) => (
              <li key={item.id} className="flex justify-between py-2 text-[14px]">
                <span>{item.nombre}</span>
                <span className="font-semibold text-accent">{item.cantidad} {item.unidad.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(["CAJA", "UNIDAD"] as const).map((unidad) => (
        <section key={unidad}>
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-mute">
            {unidad === "CAJA" ? "Cajas para barra" : "Unidades para barra"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.filter((item) => item.unidad === unidad).map((item) => {
              const cantidad = pedido[item.id] ?? 0;
              const bajo = item.existencias <= 1;
              return (
                <article key={item.id} className={`rounded-[24px] border p-4 ${bajo ? "border-warn bg-warn/10" : "border-line bg-sunken"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-semibold">{item.nombre}</h4>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-mute">{item.unidad}</p>
                    </div>
                    <span className={`text-[22px] font-bold ${bajo ? "text-warn" : "text-accent"}`}>{item.existencias}</span>
                  </div>
                  {bajo ? <p className="mt-2 text-[12px] font-medium text-warn">Quedan pocas existencias</p> : null}
                  <div className="mt-4 flex items-center justify-between">
                    <button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => cambiar(item.id, -1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-[20px]">−</button>
                    <span className="text-[14px] font-semibold">Necesito {cantidad}</span>
                    <button type="button" aria-label={`Añadir ${item.nombre}`} onClick={() => cambiar(item.id, 1)} className="grid h-9 w-9 place-items-center rounded-full bg-accent text-[20px] text-on-accent">+</button>
                  </div>
                  {gerente ? <button type="button" onClick={() => reponer(item)} className="mt-3 w-full rounded-full bg-white/10 py-2 text-[12px]">Añadir existencias</button> : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
