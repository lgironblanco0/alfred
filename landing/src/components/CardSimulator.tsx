import { useEffect, useState } from "react";

type CardSimulatorProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onValidChange: (valid: boolean) => void;
};

const TEST_NUMBER = "4242 4242 4242 4242";

function formatNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiry(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return new Date(year, month, 1) > new Date(now.getFullYear(), now.getMonth(), 1);
}

export function CardSimulator({ enabled, onEnabledChange, onValidChange }: CardSimulatorProps) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [touched, setTouched] = useState(false);

  const digits = number.replace(/\s/g, "");
  const valid =
    !enabled ||
    (digits.length === 16 && holder.trim().length >= 3 && isValidExpiry(expiry) && /^\d{3,4}$/.test(cvc));

  useEffect(() => {
    onValidChange(valid);
  }, [valid, onValidChange]);

  // Los datos de esta tarjeta son de prueba y nunca se envían ni se guardan.
  function fillTestCard() {
    setNumber(TEST_NUMBER);
    setHolder("TITULAR DE PRUEBA");
    setExpiry("12/30");
    setCvc("123");
    setTouched(true);
  }

  return (
    <div className={`card-sim ${enabled ? "card-sim--enabled" : ""}`}>
      <label className="switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            onEnabledChange(event.target.checked);
            setTouched(false);
          }}
        />
        <span className="switch__track" aria-hidden="true">
          <span className="switch__thumb" />
        </span>
        <span className="switch__text">
          Añadir tarjeta como garantía
          <small>Opcional · simulación sin cargos</small>
        </span>
      </label>

      {enabled ? (
        <div className="card-sim__body">
          <div className="test-card" aria-hidden="true">
            <div className="test-card__top">
              <span className="test-card__brand">NOCTUA</span>
              <span className="test-card__chip" />
            </div>
            <p className="test-card__number">{number || "•••• •••• •••• ••••"}</p>
            <div className="test-card__foot">
              <span>
                <small>Titular</small>
                {holder || "NOMBRE DEL TITULAR"}
              </span>
              <span>
                <small>Caduca</small>
                {expiry || "MM/AA"}
              </span>
            </div>
          </div>

          <button type="button" className="card-sim__fill" onClick={fillTestCard}>
            Usar tarjeta de prueba
          </button>

          <div className="card-sim__fields">
            <label className="field field--full">
              <span>Número de tarjeta</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                value={number}
                onChange={(event) => setNumber(formatNumber(event.target.value))}
                onBlur={() => setTouched(true)}
              />
            </label>
            <label className="field field--full">
              <span>Titular</span>
              <input
                autoComplete="off"
                placeholder="Nombre y apellidos"
                value={holder}
                onChange={(event) => setHolder(event.target.value.toUpperCase())}
                onBlur={() => setTouched(true)}
              />
            </label>
            <label className="field">
              <span>Caducidad</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="MM/AA"
                value={expiry}
                onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                onBlur={() => setTouched(true)}
              />
            </label>
            <label className="field">
              <span>CVC</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="123"
                value={cvc}
                onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => setTouched(true)}
              />
            </label>
          </div>

          {touched && !valid ? (
            <p className="form__error">Completa la tarjeta de prueba o desactívala para continuar.</p>
          ) : null}

          <p className="card-sim__disclaimer">
            Datos ficticios. No se realiza ningún cargo ni se almacena información bancaria.
          </p>
        </div>
      ) : null}
    </div>
  );
}
