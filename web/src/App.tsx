import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, clearToken, getToken } from "./api";
import { CajaBoard } from "./components/CajaBoard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FloorBoard } from "./components/FloorBoard";
import { GerenciaBoard } from "./components/GerenciaBoard";
import { Inspector } from "./components/Inspector";
import { InventoryBoard } from "./components/InventoryBoard";
import { KitchenBoard } from "./components/KitchenBoard";
import { LoginModal } from "./components/LoginModal";
import { PayDialog } from "./components/PayDialog";
import { WalkInModal } from "./components/WalkInModal";
import type { MesaZona, Sala, Usuario } from "./types";

type View = "SALA" | "COCINA" | "BARRA" | "CAJA" | "GERENCIA" | "INVENTARIO";

export function App() {
  const [sala, setSala] = useState<Sala | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeIds, setMergeIds] = useState<number[]>([]);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [payServicioId, setPayServicioId] = useState<number | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loginOpen, setLoginOpen] = useState(() => !getToken());
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<View>("SALA");
  const [focusZone, setFocusZone] = useState<MesaZona>("RESTAURANTE");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);

  function closeMobileMenu() {
    if (!mobileMenuOpen) return;
    setMobileMenuClosing(true);
    window.setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 800);
  }
  const [feedback, setFeedback] = useState<{ id: number; message: string } | null>(null);

  const refresh = useCallback(async () => {
    const next = await api.sala();
    setSala(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar la sala");
    });
  }, [refresh]);

  useEffect(() => {
    if (!getToken()) return;
    void api
      .me()
      .then((result) => setUsuario(result.usuario))
      .catch(() => {
        clearToken();
        setUsuario(null);
        setLoginOpen(true);
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const events = new EventSource("/api/eventos/sse");
    const refreshOnEvent = () => { void refresh().catch(() => undefined); };
    events.addEventListener("actualizacion", refreshOnEvent);
    return () => { events.removeEventListener("actualizacion", refreshOnEvent); events.close(); };
  }, [refresh]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const selected = useMemo(
    () => sala?.mesas.find((mesa) => mesa.id === selectedId) ?? null,
    [sala, selectedId],
  );

  const puedeGerencia = usuario?.rol === "GERENTE" || usuario?.rol === "ENCARGADO";
  const titulos: Record<View, string> = {
    SALA: "Sala",
    COCINA: "Cocina",
    BARRA: "Barra",
    CAJA: "Caja",
    GERENCIA: "Gerencia",
    INVENTARIO: "Inventario",
  };

  useEffect(() => {
    if (view === "GERENCIA" && !puedeGerencia) {
      setView("SALA");
    }
  }, [puedeGerencia, view]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await action();
      await refresh();
      setFeedback({ id: Date.now(), message: "Cambios guardados" });
    } catch (caught) {
      if (caught instanceof ApiError && caught.requiresLogin) {
        setUsuario(null);
        setLoginOpen(true);
      }
      setError(caught instanceof Error ? caught.message : "Acción no disponible");
    } finally {
      setBusy(false);
    }
  }

  function onSelect(id: number) {
    if (mergeMode) {
      setMergeIds((current) =>
        current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
      );
      setSelectedId(id);
      return;
    }
    setSelectedId(id);
  }

  async function joinSelected() {
    const host = sala?.mesas.find((mesa) => mesa.id === selectedId && mesa.servicio);
    if (!host?.servicio) {
      setError("Abre primero una mesa activa para unir el resto");
      return;
    }
    const others = mergeIds.filter((id) => id !== host.id);
    if (others.length === 0) {
      setError("Selecciona al menos otra mesa");
      return;
    }
    await run(async () => {
      await api.merge(host.servicio!.id, [host.id, ...others]);
      setMergeMode(false);
      setMergeIds([]);
    });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-[14px] focus:font-semibold focus:text-on-accent"
      >
        Saltar al contenido
      </a>
      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${mobileMenuOpen || mobileMenuClosing ? "fixed inset-y-3 right-3 z-50 w-[min(360px,calc(100vw-24px))] overflow-y-auto shadow-2xl transition-transform duration-[800ms] ease-out" : ""} ${mobileMenuOpen && !mobileMenuClosing ? "drawer-in-right" : ""} ${mobileMenuClosing ? "translate-x-[calc(100%+12px)]" : "translate-x-0"} rounded-[24px] border border-line bg-panel p-4 sm:p-5 lg:static lg:w-auto lg:translate-x-0 lg:overflow-visible lg:rounded-[32px]`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">ALFRED</p>
              <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:mt-3 sm:text-[28px]">
                {titulos[view]}
              </h1>
            </div>
            <p className="text-[12px] text-mute lg:hidden">Operación de sala</p>
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-[22px] text-accent lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              ☰
            </button>
          </div>
          <p className="mt-2 hidden text-[13px] leading-5 text-mute lg:block">
            Operación interna. Texto, estados y tiempos. Sin fotos.
          </p>
          <nav
            aria-label="Principal"
             className={`${mobileMenuOpen ? "mt-5 grid" : "hidden"} grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-8 lg:grid lg:grid-cols-1 lg:space-y-2`}
          >
            <NavButton
              icon="▣"
              label="Sala"
              active={view === "SALA"}
              current={view === "SALA"}
              onClick={() => { closeMobileMenu(); setFocusZone("RESTAURANTE"); setView("SALA"); }}
            />
            <NavButton
              icon="⌂"
              label="Terraza"
              active={view === "SALA"}
              onClick={() => { closeMobileMenu(); setFocusZone("TERRAZA"); setView("SALA"); }}
            />
            <NavButton
              icon="⌁"
              label="Cocina"
              active={view === "COCINA"}
              current={view === "COCINA"}
              onClick={() => { closeMobileMenu(); setView("COCINA"); }}
            />
            <NavButton
              icon="◉"
              label="Barra"
              active={view === "BARRA"}
              current={view === "BARRA"}
              onClick={() => { closeMobileMenu(); setView("BARRA"); }}
            />
            <NavButton
              icon="▤"
              label="Caja"
              active={view === "CAJA"}
              current={view === "CAJA"}
              onClick={() => { closeMobileMenu(); setView("CAJA"); }}
            />
            {puedeGerencia ? (
              <NavButton
                icon="⚙"
                label="Gerencia"
                active={view === "GERENCIA"}
                current={view === "GERENCIA"}
                onClick={() => { closeMobileMenu(); setView("GERENCIA"); }}
              />
            ) : null}
            <NavButton icon="▥" label="Inventario" active={view === "INVENTARIO"} current={view === "INVENTARIO"} onClick={() => { closeMobileMenu(); setView("INVENTARIO"); }} />
          </nav>
           <div className={`${mobileMenuOpen ? "mt-3 grid" : "hidden"} grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-3 lg:grid lg:grid-cols-1 lg:space-y-2`}>
             <NavButton icon="◌" label="Walk-in" onClick={() => { closeMobileMenu(); setWalkInOpen(true); }} />
            <NavButton
               icon="↘↙"
              label={mergeMode ? "Salir de unir" : "Unir mesas"}
               onClick={() => {
                 closeMobileMenu();
                setMergeMode((value) => !value);
                setMergeIds(selectedId ? [selectedId] : []);
              }}
            />
            {mergeMode ? (
              <button
                type="button"
                onClick={() => void joinSelected()}
                className="col-span-2 w-full rounded-full bg-accent px-4 py-3 text-left text-[14px] font-semibold text-on-accent sm:col-span-1 lg:col-span-1"
              >
                Confirmar unión
              </button>
            ) : null}
          </div>
          <div className="mt-8 hidden space-y-3 text-[13px] text-mute lg:block">
            <Legend color="var(--color-ok)" label="< 10 min" />
            <Legend color="var(--color-warn)" label="10–20 min" />
            <Legend color="var(--color-alert)" label="> 20 min" />
          </div>
           <div className={`${mobileMenuOpen ? "mt-5 block" : "hidden"} border-t border-line pt-4 lg:mt-8 lg:block`}>
            {usuario ? (
              <>
                <p className="text-[13px] font-semibold">{usuario.nombre}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{usuario.rol}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearToken();
                    setUsuario(null);
                    setLoginOpen(true);
                  }}
                  className="mt-3 w-full rounded-full bg-white/5 px-4 py-2 text-left text-[13px] text-soft hover:bg-white/10"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="w-full rounded-full bg-white/5 px-4 py-2 text-left text-[13px] text-soft hover:bg-white/10"
              >
                Entrar
              </button>
            )}
          </div>
        </aside>

        <main
          id="contenido-principal"
          tabIndex={-1}
          aria-busy={busy}
          className="min-w-0 rounded-[24px] border border-line bg-panel p-4 sm:p-6 lg:rounded-[32px]"
        >
          {busy ? (
            <p className="sr-only" role="status">
              Guardando cambios…
            </p>
          ) : null}
          {feedback ? (
            <div
              key={feedback.id}
              role="status"
              aria-live="polite"
              className="mb-4 rounded-2xl border border-ok/30 bg-ok/10 px-4 py-3 text-[14px] text-ok"
            >
              {feedback.message}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="mb-4 rounded-2xl bg-alert/15 px-4 py-3 text-[14px] text-alert">
              {error}
            </div>
          ) : null}
           {view === "INVENTARIO" ? <InventoryBoard gerente={usuario?.rol === "GERENTE"} /> : view === "GERENCIA" && usuario && puedeGerencia ? (
            <GerenciaBoard
              usuario={usuario}
              onRequiresLogin={() => {
                setUsuario(null);
                setLoginOpen(true);
              }}
            />
          ) : !sala ? (
            <p className="text-mute">Cargando sala…</p>
          ) : view === "SALA" ? (
            <FloorBoard
              mesas={sala.mesas}
              focusZone={focusZone}
              selectedId={selectedId}
              mergeIds={mergeIds}
              mergeMode={mergeMode}
              now={now}
              onSelect={onSelect}
              onReorder={(items) => void run(() => api.layout(items))}
            />
          ) : view === "GERENCIA" ? (
            <p className="text-mute">Inicia sesión como encargado o gerente para ver Gerencia.</p>
          ) : view === "CAJA" ? (
            <CajaBoard
              sala={sala}
              now={now}
              busy={busy}
              usuario={usuario}
              onLogin={() => setLoginOpen(true)}
              onRequestPay={setPayServicioId}
            />
          ) : (
            <KitchenBoard
              sala={sala}
              destino={view}
              now={now}
              busy={busy}
              onReady={(lineaId) => void run(() => api.ready(lineaId))}
            />
          )}
        </main>

        {view === "SALA" && selected && !mergeMode ? (
          <Inspector
            mesa={selected}
            productos={sala?.productos ?? []}
            busy={busy}
            onClose={() => setSelectedId(null)}
            onExpand={(pax) => selected?.servicio && void run(() => api.expandPax(selected.servicio!.id, pax))}
            onCall={() => selected?.servicio && void run(() => api.call(selected.servicio!.id))}
            onReady={(lineaId) => void run(() => api.ready(lineaId))}
            onAdd={(input) => {
              if (!selected) return;
              void run(async () => {
                if (selected.servicio?.id) {
                  await api.addItem(selected.servicio.id, input);
                  return;
                }
                const creado = await api.walkIn({
                  mesaId: selected.id,
                  zona: selected.zona,
                  clase: selected.clase,
                  pax: Math.max(1, selected.capacidad),
                });
                await api.addItem(creado.id, input);
              });
            }}
             onAnular={async (lineaId, motivo) => {
               await run(() => api.anular(lineaId, motivo));
             }}
            onPromo={(codigo) => selected?.servicio && void run(() => api.promo(selected.servicio!.id, codigo))}
            onSplit={(modo) => selected?.servicio && void run(() => api.split(selected.servicio!.id, modo))}
            onCancel={() => setConfirmCancel(true)}
          />
        ) : null}
      </div>

      {walkInOpen && sala ? (
        <WalkInModal
          mesas={sala.mesas}
          onClose={() => setWalkInOpen(false)}
          onSubmit={async (input) => {
            const servicio = await api.walkIn(input);
            const next = await refresh();
            const mesa = next.mesas.find((item) => servicio.mesaIds.includes(item.id));
            if (mesa) setSelectedId(mesa.id);
          }}
        />
      ) : null}

      {confirmCancel ? (
        <ConfirmDialog
          title="Liberar mesa"
          body="Se cancela el servicio activo, se registra el evento y la mesa queda libre. Esta acción no se puede deshacer."
          confirmLabel="Cancelar servicio"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            const servicioId = selected?.servicio?.id;
            setConfirmCancel(false);
            if (servicioId) {
              void run(async () => {
                await api.cancel(servicioId, "Cancel Table / Release Service");
                setSelectedId(null);
              });
            }
          }}
        />
      ) : null}

      {payServicioId ? (
        <PayDialog
          servicio={sala?.mesas.flatMap((mesa) => (mesa.servicio?.id === payServicioId ? [mesa.servicio] : [])).find(Boolean) ?? {
            id: payServicioId,
            estado: "ABIERTA",
            pax: 1,
            origen: "WALK_IN",
            openedAt: new Date().toISOString(),
            closedAt: null,
            descuentoCodigo: null,
            descuentoTipo: null,
            descuentoValor: null,
            splitModo: "NINGUNO",
            mesaIds: [],
            mesaLabels: [],
            metodoPago: null,
            lineas: [],
            eventos: [],
            pagos: [],
            subtotal: 0,
            discount: 0,
            total: 0,
            pagado: 0,
            saldo: 0,
          }}
          onCancel={() => setPayServicioId(null)}
          onConfirm={(body) => {
            const servicioId = payServicioId;
            setPayServicioId(null);
            if (servicioId) {
              void run(() => api.pagar(servicioId, body));
            }
          }}
        />
      ) : null}

      {loginOpen ? (
        <LoginModal
          dismissible={Boolean(usuario)}
          onClose={() => {
            if (usuario) setLoginOpen(false);
          }}
          onSuccess={(nextUsuario) => {
            setUsuario(nextUsuario);
            setLoginOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  current,
  onClick,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  current?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={current ? "page" : undefined}
      onClick={onClick}
       className={`min-h-10 w-full rounded-full px-3 py-2 text-left text-[13px] font-medium lg:min-h-11 lg:px-4 lg:py-3 lg:text-[14px] ${
        active
          ? "bg-accent text-on-accent hover:bg-accent-dim"
          : "bg-white/5 text-ink hover:bg-white/10"
      }`}
    >
      <span className="mr-2 inline-flex w-5 justify-center text-[18px] text-accent lg:mr-2" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
