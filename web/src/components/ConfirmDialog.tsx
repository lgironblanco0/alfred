import { useId } from "react";
import { useModalFocus } from "../lib/useModalFocus";

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "alert" | "ok";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = "alert",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useModalFocus<HTMLDivElement>(onCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-[28px] border border-line bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[22px] font-semibold tracking-tight">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-[15px] leading-6 text-soft">
          {body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            data-autofocus
            className="rounded-full px-4 py-2 text-[15px] text-soft hover:bg-white/5"
            onClick={onCancel}
          >
            Volver
          </button>
          <button
            type="button"
            className={`rounded-full px-5 py-2 text-[15px] font-semibold ${
              tone === "alert" ? "bg-alert text-on-accent" : "bg-accent text-on-accent"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
