import { useId, useState } from "react";
import { api, setToken } from "../api";
import { useModalFocus } from "../lib/useModalFocus";
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
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const panelRef = useModalFocus<HTMLFormElement>(dismissible ? onClose : undefined);

  async function submit(selectedCodigo = codigo) {
    setPending(true);
    setError(null);
    try {
      const result = await api.login(selectedCodigo.trim());
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        className="w-full max-w-md rounded-[28px] border border-line bg-panel p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-accent">ALFRED</p>
        <h2 id={titleId} className="mt-2 text-[26px] font-semibold tracking-tight">
          Entrar en ALFRED
        </h2>
         <p id={descriptionId} className="mt-1 text-[14px] text-mute">
           Selecciona el perfil con el que quieres entrar en ALFRED.
         </p>

         <div className="mt-5 grid gap-3">
           {[
             { codigo: "0", titulo: "Gerente", detalle: "Gestión completa, caja y empleados" },
             { codigo: "1", titulo: "Encargado", detalle: "Sala, comandas, cocina, barra y caja" },
             { codigo: "2", titulo: "Camarero", detalle: "Mesas y toma de comandas" },
           ].map((perfil, index) => (
             <button
               key={perfil.codigo}
               type="button"
               data-autofocus={index === 0 ? true : undefined}
               disabled={pending}
               onClick={() => {
                 setCodigo(perfil.codigo);
                 setError(null);
                 void submit(perfil.codigo);
               }}
               className="rounded-2xl border border-line bg-white/5 px-4 py-3 text-left transition hover:border-accent hover:bg-accent/10 disabled:opacity-60"
             >
               <span className="block text-[15px] font-semibold">{perfil.titulo}</span>
               <span className="mt-1 block text-[12px] text-mute">{perfil.detalle}</span>
             </button>
           ))}
         </div>

        {error ? (
          <p id={errorId} role="alert" className="mt-3 text-[13px] text-alert">
            {error}
          </p>
        ) : null}

         <div className="mt-6 flex justify-end gap-2">
          {dismissible ? (
            <button type="button" className="rounded-full px-4 py-2 text-soft" onClick={onClose}>
              Cancelar
            </button>
          ) : null}
           <span className="text-[12px] text-subtle">Perfiles de demostración</span>
         </div>
      </form>
    </div>
  );
}
