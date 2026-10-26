import { useCallback, useState, type FormEvent } from "react";
import { createReservation, type ReservationConfirmation } from "../lib/reservations";
import { CardSimulator } from "./CardSimulator";
import { Reveal } from "./Reveal";

const LUNCH = ["13:00", "13:30", "14:00", "14:30"];
const DINNER = ["20:00", "20:30", "21:00", "21:30", "22:00"];

function toLocalISO(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

type Errors = Partial<Record<"nombre" | "fecha" | "hora" | "politica", string>>;

export function Reservation() {
  const today = toLocalISO(new Date());
  const maxDate = toLocalISO(new Date(Date.now() + 120 * 86_400_000));

  const [nombre, setNombre] = useState("");
  const [personas, setPersonas] = useState(2);
  const [fecha, setFecha] = useState(today);
  const [hora, setHora] = useState("21:00");
  const [tarjeta, setTarjeta] = useState(false);
  const [cardValid, setCardValid] = useState(true);
  const [acepta, setAcepta] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(null);

  const onCardValidChange = useCallback((valid: boolean) => setCardValid(valid), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Errors = {};
    if (nombre.trim().length < 2) nextErrors.nombre = "Indica el nombre de la reserva.";
    if (!fecha) nextErrors.fecha = "Selecciona una fecha.";
    if (!hora) nextErrors.hora = "Selecciona una hora.";
    if (!acepta) nextErrors.politica = "Acepta la política de reserva para continuar.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    try {
      const result = await createReservation({
        nombre: nombre.trim(),
        personas,
        fecha,
        hora,
        tarjetaSimulada: tarjeta,
        aceptaPolitica: acepta,
      });
      setConfirmation(result);
    } finally {
      setStatus("idle");
    }
  }

  function reset() {
    setConfirmation(null);
    setNombre("");
    setPersonas(2);
    setFecha(today);
    setHora("21:00");
    setTarjeta(false);
    setAcepta(false);
    setErrors({});
  }

  return (
    <section className="section reservation" id="reservar">
      <div className="container">
        <div className="reservation__shell">
          <Reveal className="reservation__intro">
            <p className="eyebrow">05 — La reserva</p>
            <h2>
              Reserva
              <em>tu mesa.</em>
            </h2>
            <p className="lead">
              Servicio de comida y cena. Doce mesas, dos turnos y una sola regla: llegar sin prisa.
            </p>

            <dl className="reservation__details">
              <div>
                <dt>Dirección</dt>
                <dd>Carretera de la Sierra, 14<br />28410 Madrid</dd>
              </div>
              <div>
                <dt>Comidas</dt>
                <dd>Miércoles a domingo<br />13:00 — 15:30</dd>
              </div>
              <div>
                <dt>Cenas</dt>
                <dd>Miércoles a sábado<br />20:00 — 22:30</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>
                  <a href="tel:+34910000000">+34 910 00 00 00</a>
                  <br />
                  <a href="mailto:reservas@noctua.example">reservas@noctua.example</a>
                </dd>
              </div>
            </dl>

            <p className="reservation__policy">
              Las reservas se mantienen durante 15 minutos. Para grupos de más de 8 personas,
              escríbenos directamente.
            </p>
          </Reveal>

          <Reveal className="reservation__panel" delay={120}>
            {confirmation ? (
              <div className="confirmation" role="status">
                <span className="confirmation__mark" aria-hidden="true">
                  ✓
                </span>
                <p className="eyebrow">Mesa confirmada</p>
                <h3>Te esperamos, {confirmation.nombre.split(" ")[0]}.</h3>
                <p className="confirmation__copy">
                  {formatDate(confirmation.fecha)} a las {confirmation.hora} ·{" "}
                  {confirmation.personas} {confirmation.personas === 1 ? "persona" : "personas"}.
                </p>
                <div className="confirmation__code">
                  <span>Localizador</span>
                  <strong>{confirmation.codigo}</strong>
                </div>
                {confirmation.tarjetaSimulada ? (
                  <p className="confirmation__note">Tarjeta de prueba registrada como garantía.</p>
                ) : null}
                <p className="confirmation__note">
                  Guarda este localizador. Para cualquier cambio, contacta con nosotros.
                </p>
                <button type="button" className="button button--ghost" onClick={reset}>
                  Hacer otra reserva
                </button>
              </div>
            ) : (
              <form className="form" onSubmit={onSubmit} noValidate>
                <div className="form__head">
                  <h3>Reserva de mesa</h3>
                  <span>Confirmación inmediata</span>
                </div>

                <div className="form__grid">
                  <label className={`field field--full ${errors.nombre ? "field--error" : ""}`}>
                    <span>Nombre</span>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Nombre y apellidos"
                      value={nombre}
                      onChange={(event) => setNombre(event.target.value)}
                      aria-invalid={Boolean(errors.nombre)}
                    />
                    {errors.nombre ? <small className="form__error">{errors.nombre}</small> : null}
                  </label>

                  <label className="field">
                    <span>Personas</span>
                    <select
                      value={personas}
                      onChange={(event) => setPersonas(Number(event.target.value))}
                    >
                      {Array.from({ length: 8 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {value} {value === 1 ? "persona" : "personas"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={`field ${errors.fecha ? "field--error" : ""}`}>
                    <span>Fecha</span>
                    <input
                      type="date"
                      min={today}
                      max={maxDate}
                      value={fecha}
                      onChange={(event) => setFecha(event.target.value)}
                      aria-invalid={Boolean(errors.fecha)}
                    />
                    {errors.fecha ? <small className="form__error">{errors.fecha}</small> : null}
                  </label>

                  <label className={`field field--full ${errors.hora ? "field--error" : ""}`}>
                    <span>Hora</span>
                    <select value={hora} onChange={(event) => setHora(event.target.value)}>
                      <optgroup label="Comida">
                        {LUNCH.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Cena">
                        {DINNER.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {errors.hora ? <small className="form__error">{errors.hora}</small> : null}
                  </label>
                </div>

                <CardSimulator
                  enabled={tarjeta}
                  onEnabledChange={setTarjeta}
                  onValidChange={onCardValidChange}
                />

                <label className={`check ${errors.politica ? "check--error" : ""}`}>
                  <input
                    type="checkbox"
                    checked={acepta}
                    onChange={(event) => setAcepta(event.target.checked)}
                  />
                  <span className="check__box" aria-hidden="true" />
                  <span>
                    Acepto la política de reserva y no-show. La tarjeta de prueba no supone ningún
                    cargo.
                  </span>
                </label>
                {errors.politica ? <p className="form__error">{errors.politica}</p> : null}

                <button
                  type="submit"
                  className="button button--bronze form__submit"
                  disabled={status === "sending" || (tarjeta && !cardValid)}
                >
                  {status === "sending" ? "Confirmando…" : "Confirmar reserva"}
                </button>

                <p className="form__legal">
                  Experiencia de demostración. No se realizarán cobros ni se recogerán datos
                  bancarios reales.
                </p>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
