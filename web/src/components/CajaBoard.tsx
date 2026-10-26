import { formatTimer, money } from "../lib/format";
import type { Sala, Servicio, Usuario } from "../types";

type CajaBoardProps = {
  sala: Sala;
  now: number;
  busy: boolean;
  usuario: Usuario | null;
  onLogin: () => void;
  onRequestPay: (servicioId: number) => void;
};

type Cuenta = {
  servicio: Servicio;
  mesas: string;
};

function abrirCuentas(sala: Sala): Cuenta[] {
  const map = new Map<number, Cuenta>();

  for (const mesa of sala.mesas) {
    const servicio = mesa.servicio;
    if (!servicio || servicio.estado !== "ABIERTA") continue;

    const existing = map.get(servicio.id);
    if (existing) {
      existing.mesas = servicio.mesaLabels.join(" + ");
      continue;
    }

    map.set(servicio.id, {
      servicio,
      mesas: servicio.mesaLabels.join(" + "),
    });
  }

  return [...map.values()].sort(
    (a, b) => new Date(a.servicio.openedAt).getTime() - new Date(b.servicio.openedAt).getTime(),
  );
}

export function CajaBoard({ sala, now, busy, usuario, onLogin, onRequestPay }: CajaBoardProps) {
  const cuentas = abrirCuentas(sala);
  const totalAbierto = cuentas.reduce((sum, cuenta) => sum + cuenta.servicio.total, 0);
  const puedeCobrar = usuario?.rol === "ENCARGADO" || usuario?.rol === "GERENTE";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">Caja</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Cuentas abiertas</h1>
          <p className="mt-1 text-[14px] text-mute">
            {cuentas.length} mesas · {money(totalAbierto)} pendiente de cobro
          </p>
        </div>
        <div className="text-right">
          {usuario ? (
            <>
              <p className="text-[13px] font-semibold">{usuario.nombre}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{usuario.rol}</p>
              <p className="mt-1 max-w-[240px] text-[11px] text-subtle">
                {puedeCobrar ? "Puede registrar cobros." : "Solo lectura. El cobro requiere Encargado o Gerente."}
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] text-mute">Sin sesión</p>
              <button
                type="button"
                onClick={onLogin}
                className="mt-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium"
              >
                Cobrar
              </button>
            </>
          )}
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-line text-[15px] text-subtle">
          No hay cuentas abiertas.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-sunken">
            {cuentas.map(({ servicio, mesas }) => {
              const minutos = Math.max(
                0,
                Math.floor((now - new Date(servicio.openedAt).getTime()) / 60000),
              );
              return (
                <li key={servicio.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-44 shrink-0">
                    <p className="text-[16px] font-semibold">{mesas}</p>
                    <p className="text-[12px] text-subtle">
                      Servicio {servicio.id} · {servicio.pax} pax
                    </p>
                  </div>
                  <div className="w-20 shrink-0">
                    <p className="text-[14px] text-soft">{formatTimer(minutos)}</p>
                    <p className="text-[11px] text-subtle">Abierta</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-mute">
                      {servicio.lineas.filter((linea) => linea.estado !== "ANULADO").length} líneas
                    </p>
                    {servicio.descuentoCodigo ? (
                      <p className="text-[12px] text-accent">
                        {servicio.descuentoCodigo} · -{money(servicio.discount)}
                      </p>
                    ) : null}
                  </div>
                  <p className="w-28 shrink-0 text-right text-[20px] font-semibold tracking-tight">
                    {money(servicio.total)}
                  </p>
                  <button
                    type="button"
                    disabled={busy || Boolean(usuario && !puedeCobrar)}
                    onClick={() => (puedeCobrar ? onRequestPay(servicio.id) : onLogin())}
                    className="shrink-0 rounded-full bg-accent px-5 py-2 text-[13px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {!usuario ? "Cobrar" : puedeCobrar ? "Cobrar" : "Sin permiso"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
