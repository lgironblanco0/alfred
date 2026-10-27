import { useState } from "react";
import { api, setToken } from "../api";
import type { Usuario } from "../types";

type LoginModalProps = {
  dismissible?: boolean;
  onClose: () => void;
  onSuccess: (usuario: Usuario) => void;
};

export function LoginModal({ dismissible = true, onClose, onSuccess }: LoginModalProps) {
  const [codigo, setCodigo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await api.login(codigo.trim());
      setToken(result.token);
      onSuccess(result.usuario);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-[28px] border border-line bg-panel p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">ALFRED</p>
        <h2 className="mt-2 text-[26px] font-semibold tracking-tight">Entrar en ALFRED</h2>
        <p className="mt-1 text-[14px] text-mute">
          Introduce tu código de empleado. No necesitas usuario ni contraseña.
        </p>

        <label className="mt-5 block text-[12px] font-medium uppercase tracking-[0.14em] text-mute">
          Código de empleado
        </label>
        <input
          type="text"
          required
          autoFocus
          autoComplete="off"
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-[15px]"
          placeholder="0, 1 o 2"
        />
        <p className="mt-2 text-[12px] text-subtle">
          <span className="text-soft">0</span> Gerente · <span className="text-soft">1</span> Responsable ·{" "}
          <span className="text-soft">2</span> Camareros
        </p>

        {error ? <p className="mt-3 text-[13px] text-alert">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          {dismissible ? (
            <button type="button" className="rounded-full px-4 py-2 text-soft" onClick={onClose}>
              Cancelar
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-on-accent disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
