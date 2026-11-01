import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api } from "../api";
import { money } from "../lib/format";
import type {
  Caja,
  Empleado,
  HistoricoPage,
  Rol,
  SesionCaja,
  Usuario,
} from "../types";

type Tab = "HISTORICO" | "CAJA" | "EMPLEADOS";

type GerenciaBoardProps = {
  usuario: Usuario;
  onRequiresLogin: () => void;
};

const inputClass =
  "mt-1 w-full rounded-2xl border border-line bg-sunken px-3 py-2 text-[14px] text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function eurosToCents(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function fecha(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

export function GerenciaBoard({ usuario, onRequiresLogin }: GerenciaBoardProps) {
  const [tab, setTab] = useState<Tab>("HISTORICO");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [historico, setHistorico] = useState<HistoricoPage | null>(null);
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [caja, setCaja] = useState<Caja | null>(null);
  const [sesiones, setSesiones] = useState<SesionCaja[]>([]);
  const [fondo, setFondo] = useState("100,00");
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevo, setNuevo] = useState({
    codigo: "",
    nombre: "",
    email: "",
    password: "",
    rol: "CAMARERO" as Rol,
  });

  const esGerente = usuario.rol === "GERENTE";
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "HISTORICO", label: "Histórico" },
    { id: "CAJA", label: "Caja" },
    ...(esGerente ? [{ id: "EMPLEADOS" as Tab, label: "Empleados" }] : []),
  ];

  const ejecutar = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      setCargando(true);
      setError(null);
      try {
        return await action();
      } catch (caught) {
        if (caught instanceof ApiError && caught.requiresLogin) {
          onRequiresLogin();
          return null;
        }
        setError(caught instanceof Error ? caught.message : "No se pudo completar la acción");
        return null;
      } finally {
        setCargando(false);
      }
    },
    [onRequiresLogin],
  );

  const cargarHistorico = useCallback(
    async (offset = 0) => {
      const page = await ejecutar(() =>
        api.historico({
          estado: estado || undefined,
          desde: desde ? `${desde}T00:00:00.000Z` : undefined,
          hasta: hasta ? `${hasta}T23:59:59.999Z` : undefined,
          limit: 20,
          offset,
        }),
      );
      if (page) setHistorico(page);
    },
    [desde, ejecutar, estado, hasta],
  );

  const cargarCaja = useCallback(async () => {
    const [actual, cierres] = await Promise.all([
      ejecutar(() => api.caja()),
      ejecutar(() => api.sesionesCaja(10)),
    ]);
    if (actual) setCaja(actual);
    if (cierres) setSesiones(cierres.sesiones);
  }, [ejecutar]);

  const cargarEmpleados = useCallback(async () => {
    if (!esGerente) return;
    const respuesta = await ejecutar(() => api.empleados());
    if (respuesta) setEmpleados(respuesta.usuarios);
  }, [ejecutar, esGerente]);

  useEffect(() => {
    if (tab === "HISTORICO") void cargarHistorico(0);
    if (tab === "CAJA") void cargarCaja();
    if (tab === "EMPLEADOS") void cargarEmpleados();
  }, [cargarCaja, cargarEmpleados, cargarHistorico, tab]);

  function confirmar(mensaje: string) {
    setAviso(mensaje);
    window.setTimeout(() => setAviso(null), 4000);
  }

  async function abrirCaja(event: FormEvent) {
    event.preventDefault();
    const cents = eurosToCents(fondo);
    if (cents === null) {
      setError("Indica un fondo inicial válido");
      return;
    }
    const resultado = await ejecutar(() => api.abrirCaja(cents));
    if (resultado) {
      confirmar("Caja abierta");
      setContado("");
      await cargarCaja();
    }
  }

  async function cerrarCaja(event: FormEvent) {
    event.preventDefault();
    const cents = eurosToCents(contado);
    if (cents === null) {
      setError("Indica el efectivo contado");
      return;
    }
    const resultado = await ejecutar(() => api.cerrarCaja(cents, notas || undefined));
    if (resultado) {
      confirmar("Caja cerrada y arqueo guardado");
      setNotas("");
      await cargarCaja();
    }
  }

  async function crearEmpleado(event: FormEvent) {
    event.preventDefault();
    const resultado = await ejecutar(() => api.crearEmpleado(nuevo));
    if (resultado) {
      confirmar(`Empleado creado: ${resultado.usuario.nombre}`);
      setNuevo({ codigo: "", nombre: "", email: "", password: "", rol: "CAMARERO" });
      await cargarEmpleados();
    }
  }

  async function cambiarEmpleado(id: number, cambios: { activo?: boolean; rol?: Rol }) {
    const resultado = await ejecutar(() => api.actualizarEmpleado(id, cambios));
    if (resultado) {
      confirmar("Empleado actualizado");
      await cargarEmpleados();
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">Gerencia</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">
          Histórico, caja y equipo
        </h1>
        <p className="mt-1 text-[14px] text-mute">
          {esGerente
            ? "Como gerente puedes consultar el histórico, operar el arqueo y gestionar empleados."
            : "Como encargado puedes consultar el histórico y operar el arqueo de caja."}
        </p>
      </div>

      <div role="tablist" aria-label="Secciones de gerencia" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-full px-5 py-2 text-[14px] font-medium ${
              tab === item.id ? "bg-accent text-on-accent" : "bg-white/5 text-ink hover:bg-white/10"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {aviso ? (
        <div role="status" className="mb-4 rounded-2xl border border-ok/30 bg-ok/10 px-4 py-3 text-[14px] text-ok">
          {aviso}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mb-4 rounded-2xl bg-alert/15 px-4 py-3 text-[14px] text-alert">
          {error}
        </div>
      ) : null}

      {tab === "HISTORICO" ? (
        <section aria-labelledby="titulo-historico">
          <h2 id="titulo-historico" className="text-[20px] font-semibold">
            Histórico de cuentas
          </h2>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void cargarHistorico(0);
            }}
          >
            <label className="text-[13px] text-soft">
              Estado
              <select
                className={inputClass}
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                <option value="">Todas cerradas</option>
                <option value="PAGADA">Pagadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </label>
            <label className="text-[13px] text-soft">
              Desde
              <input type="date" className={inputClass} value={desde} onChange={(event) => setDesde(event.target.value)} />
            </label>
            <label className="text-[13px] text-soft">
              Hasta
              <input type="date" className={inputClass} value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </label>
            <button
              type="submit"
              disabled={cargando}
              className="min-h-11 rounded-full bg-white/10 px-5 py-2 text-[14px] font-medium hover:bg-white/15 disabled:opacity-40"
            >
              Filtrar
            </button>
          </form>

          {!historico ? (
            <p className="mt-6 text-mute">Cargando histórico…</p>
          ) : historico.servicios.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-6 text-[14px] text-subtle">
              No hay cuentas cerradas con esos filtros.
            </p>
          ) : (
            <>
              <p className="mt-4 text-[13px] text-mute">
                {historico.total} cuentas · mostrando {historico.servicios.length}
              </p>
              <ul className="mt-3 space-y-2">
                {historico.servicios.map((servicio) => (
                  <li key={servicio.id} className="rounded-2xl border border-line bg-sunken">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <span>
                          <span className="text-[15px] font-semibold">
                            {servicio.mesaLabels.join(" + ") || `Servicio ${servicio.id}`}
                          </span>
                          <span className="ml-2 text-[12px] text-subtle">
                            {servicio.estado} · {fecha(servicio.closedAt)}
                          </span>
                        </span>
                        <span className="text-[15px] font-semibold">
                          {money(servicio.total)} ·{" "}
                          {servicio.metodoPago === "TARJETA" ? "Tarjeta" : "Efectivo"}
                        </span>
                      </summary>
                      <div className="border-t border-line px-4 py-3 text-[13px] text-soft">
                        <p>
                          {servicio.pax} pax · {servicio.lineas.length} líneas · descuento{" "}
                          {money(servicio.discount)}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {servicio.lineas.map((linea) => (
                            <li key={linea.id}>
                              {linea.cantidad} × {linea.nombre} · {money(linea.precioUnitario * linea.cantidad)}
                              {linea.estado === "ANULADO" ? " (anulada)" : ""}
                            </li>
                          ))}
                        </ul>
                        <ul className="mt-2 space-y-1 text-[12px] text-subtle">
                          {servicio.eventos.map((evento) => (
                            <li key={evento.id}>
                              {fecha(evento.createdAt)} · {evento.tipo} · {evento.detalle}
                              {evento.actor ? ` — ${evento.actor.nombre}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={cargando || historico.offset === 0}
                  onClick={() => void cargarHistorico(Math.max(0, historico.offset - historico.limit))}
                  className="min-h-11 rounded-full bg-white/10 px-5 py-2 text-[14px] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={cargando || historico.offset + historico.limit >= historico.total}
                  onClick={() => void cargarHistorico(historico.offset + historico.limit)}
                  className="min-h-11 rounded-full bg-white/10 px-5 py-2 text-[14px] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === "CAJA" && caja ? (
        <section aria-labelledby="titulo-caja">
          <h2 id="titulo-caja" className="text-[20px] font-semibold">
            Arqueo de caja
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Dato label="Fondo inicial" valor={money(caja.sesion?.fondoInicial ?? 0)} />
            <Dato label="Ventas en efectivo" valor={money(caja.resumen.ventasEfectivo)} />
            <Dato label="Ventas con tarjeta" valor={money(caja.resumen.ventasTarjeta)} />
            <Dato label="Total cobrado" valor={money(caja.resumen.totalCobrado)} />
            <Dato label="Número de cobros" valor={String(caja.resumen.numeroCobros)} />
            <Dato label="Efectivo esperado" valor={money(caja.resumen.efectivoEsperado)} destacado />
          </dl>

          {caja.sesion ? (
            <div className="mt-5 rounded-2xl border border-line bg-sunken p-4">
              <p className="text-[14px] font-semibold">
                Caja abierta {fecha(caja.sesion.abiertaAt)} por {caja.sesion.abiertaPor?.nombre ?? "—"}
              </p>
              <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" onSubmit={cerrarCaja}>
                <label className="text-[13px] text-soft">
                  Efectivo contado (€)
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={contado}
                    onChange={(event) => setContado(event.target.value)}
                    placeholder="0,00"
                    required
                  />
                </label>
                <label className="text-[13px] text-soft">
                  Notas (opcional)
                  <input
                    className={inputClass}
                    value={notas}
                    maxLength={500}
                    onChange={(event) => setNotas(event.target.value)}
                    placeholder="Explica cualquier diferencia"
                  />
                </label>
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-11 rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-on-accent disabled:opacity-40"
                >
                  Cerrar caja
                </button>
              </form>
            </div>
          ) : (
            <form
              className="mt-5 grid gap-3 rounded-2xl border border-line bg-sunken p-4 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={abrirCaja}
            >
              <label className="text-[13px] text-soft">
                Fondo inicial (€)
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={fondo}
                  onChange={(event) => setFondo(event.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                className="min-h-11 rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-on-accent disabled:opacity-40"
              >
                Abrir caja
              </button>
            </form>
          )}

          <h3 className="mt-6 text-[16px] font-semibold">Últimos cierres</h3>
          {sesiones.length === 0 ? (
            <p className="mt-2 text-[14px] text-subtle">Todavía no hay cierres.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {sesiones.map((sesion) => (
                <li key={sesion.id} className="rounded-2xl border border-line px-4 py-3 text-[13px] text-soft">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{fecha(sesion.cerradaAt)}</span>
                    <span className="font-semibold">
                      {sesion.diferencia === null
                        ? "—"
                        : `${sesion.diferencia === 0 ? "Cuadra" : sesion.diferencia > 0 ? "Sobran" : "Faltan"} ${money(Math.abs(sesion.diferencia))}`}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-subtle">
                    Esperado {money(sesion.efectivoEsperado ?? 0)} · contado{" "}
                    {money(sesion.efectivoContado ?? 0)} · cerró {sesion.cerradaPor?.nombre ?? "—"}
                    {sesion.notas ? ` · ${sesion.notas}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "EMPLEADOS" && esGerente ? (
        <section aria-labelledby="titulo-empleados">
          <h2 id="titulo-empleados" className="text-[20px] font-semibold">
            Empleados
          </h2>

          <form className="mt-3 rounded-2xl border border-line bg-sunken p-4" onSubmit={crearEmpleado}>
            <h3 className="text-[15px] font-semibold">Nuevo empleado</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-[13px] text-soft">
                Código
                <input
                  className={inputClass}
                  value={nuevo.codigo}
                  onChange={(event) => setNuevo({ ...nuevo, codigo: event.target.value })}
                  required
                  maxLength={20}
                />
              </label>
              <label className="text-[13px] text-soft">
                Nombre
                <input
                  className={inputClass}
                  value={nuevo.nombre}
                  onChange={(event) => setNuevo({ ...nuevo, nombre: event.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="text-[13px] text-soft">
                Email
                <input
                  type="email"
                  className={inputClass}
                  value={nuevo.email}
                  onChange={(event) => setNuevo({ ...nuevo, email: event.target.value })}
                  required
                />
              </label>
              <label className="text-[13px] text-soft">
                Contraseña
                <input
                  type="password"
                  className={inputClass}
                  value={nuevo.password}
                  onChange={(event) => setNuevo({ ...nuevo, password: event.target.value })}
                  required
                  minLength={8}
                />
              </label>
              <label className="text-[13px] text-soft">
                Rol
                <select
                  className={inputClass}
                  value={nuevo.rol}
                  onChange={(event) => setNuevo({ ...nuevo, rol: event.target.value as Rol })}
                >
                  <option value="CAMARERO">Camarero</option>
                  <option value="ENCARGADO">Encargado</option>
                  <option value="GERENTE">Gerente</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-11 w-full rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-on-accent disabled:opacity-40"
                >
                  Crear empleado
                </button>
              </div>
            </div>
          </form>

          {empleados.length === 0 ? (
            <p className="mt-4 text-[14px] text-subtle">Cargando empleados…</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {empleados.map((empleado) => (
                <li
                  key={empleado.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className={`text-[15px] font-semibold ${empleado.activo ? "" : "text-subtle line-through"}`}>
                      {empleado.nombre}
                    </p>
                    <p className="text-[12px] text-subtle">
                      Código {empleado.codigo} · {empleado.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[12px] text-subtle">
                      <span className="sr-only">Rol de {empleado.nombre}</span>
                      <select
                        className="rounded-full border border-line bg-sunken px-3 py-2 text-[13px] text-ink"
                        value={empleado.rol}
                        onChange={(event) =>
                          void cambiarEmpleado(empleado.id, { rol: event.target.value as Rol })
                        }
                      >
                        <option value="CAMARERO">Camarero</option>
                        <option value="ENCARGADO">Encargado</option>
                        <option value="GERENTE">Gerente</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={cargando || empleado.id === usuario.id}
                      title={empleado.id === usuario.id ? "No puedes desactivar tu propia sesión" : undefined}
                      onClick={() => void cambiarEmpleado(empleado.id, { activo: !empleado.activo })}
                      className="min-h-11 rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium disabled:opacity-40"
                    >
                      {empleado.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function Dato({ label, valor, destacado = false }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${destacado ? "border-accent/40 bg-accent/10" : "border-line bg-sunken"}`}>
      <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">{label}</dt>
      <dd className="mt-1 text-[17px] font-semibold">{valor}</dd>
    </div>
  );
}
