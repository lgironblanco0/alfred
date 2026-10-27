import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, clearToken, getToken } from "./api";
import { CajaBoard } from "./components/CajaBoard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FloorBoard } from "./components/FloorBoard";
import { Inspector } from "./components/Inspector";
import { KitchenBoard } from "./components/KitchenBoard";
import { LoginModal } from "./components/LoginModal";
import { WalkInModal } from "./components/WalkInModal";
import type { Sala, Usuario } from "./types";

type View = "SALA" | "COCINA" | "BARRA" | "CAJA";

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
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => sala?.mesas.find((mesa) => mesa.id === selectedId) ?? null,
    [sala, selectedId],
  );

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
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
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
        <aside className="rounded-[32px] border border-line bg-panel p-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">ALFRED</p>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
            {view === "SALA" ? "Sala" : view === "COCINA" ? "Cocina" : view === "BARRA" ? "Barra" : "Caja"}
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-mute">Operación interna. Texto, estados y tiempos. Sin fotos.</p>
          <div className="mt-8 space-y-2">
            <NavButton label="Sala" active={view === "SALA"} onClick={() => setView("SALA")} />
            <NavButton label="Cocina" active={view === "COCINA"} onClick={() => setView("COCINA")} />
            <NavButton label="Barra" active={view === "BARRA"} onClick={() => setView("BARRA")} />
            <NavButton label="Caja" active={view === "CAJA"} onClick={() => setView("CAJA")} />
          </div>
          <div className="mt-3 space-y-2">
            <NavButton label="Walk-in" onClick={() => setWalkInOpen(true)} />
            <NavButton
              label={mergeMode ? "Salir de unir" : "Unir mesas"}
              onClick={() => {
                setMergeMode((value) => !value);
                setMergeIds(selectedId ? [selectedId] : []);
              }}
            />
            {mergeMode ? (
              <button
                type="button"
                onClick={() => void joinSelected()}
                className="w-full rounded-full bg-accent px-4 py-3 text-left text-[14px] font-semibold text-on-accent"
              >
                Confirmar unión
              </button>
            ) : null}
          </div>
          <div className="mt-10 space-y-3 text-[13px] text-mute">
            <Legend color="var(--color-ok)" label="< 10 min" />
            <Legend color="var(--color-warn)" label="10–20 min" />
            <Legend color="var(--color-alert)" label="> 20 min" />
          </div>
          <div className="mt-8 border-t border-line pt-4">
            {usuario ? (
              <>
                <p className="text-[13px] font-semibold">{usuario.nombre}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{usuario.rol}</p>
                <button
                  type="button"
                  onClick={() => {
                    clearToken();
                    setUsuario(null);
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

        <main className="rounded-[32px] border border-line bg-panel p-6">
          {error ? (
            <div className="mb-4 rounded-2xl bg-alert/15 px-4 py-3 text-[14px] text-alert">{error}</div>
          ) : null}
          {!sala ? (
            <p className="text-mute">Cargando sala…</p>
          ) : view === "SALA" ? (
            <FloorBoard
              mesas={sala.mesas}
              selectedId={selectedId}
              mergeIds={mergeIds}
              mergeMode={mergeMode}
              now={now}
              onSelect={onSelect}
              onReorder={(items) => void run(() => api.layout(items))}
            />
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
                let servicioId = selected.servicio?.id;
                if (!servicioId) {
                  const creado = await api.walkIn({
                    mesaId: selected.id,
                    pax: Math.max(1, selected.capacidad),
                  });
                  servicioId = creado.id;
                }
                await api.addItem(servicioId, input);
              });
            }}
            onAnular={(lineaId, motivo) => void run(() => api.anular(lineaId, motivo))}
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
        <ConfirmDialog
          title="Cobrar cuenta"
          body="Se marca el servicio como pagado y la mesa queda libre. Confirma que el cobro se ha realizado."
          confirmLabel="Confirmar cobro"
          onCancel={() => setPayServicioId(null)}
          onConfirm={() => {
            const servicioId = payServicioId;
            setPayServicioId(null);
            if (servicioId) {
              void run(() => api.pagar(servicioId));
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

function NavButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-full px-4 py-3 text-left text-[14px] font-medium hover:bg-white/10 ${
        active ? "bg-accent text-on-accent hover:bg-accent-dim" : "bg-white/5 text-ink"
      }`}
    >
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
