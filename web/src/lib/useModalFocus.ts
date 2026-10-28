import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const dialogStack: HTMLElement[] = [];
let scrollLocks = 0;
let previousBodyOverflow = "";

function isVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);
}

function lockScroll(): void {
  if (scrollLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
}

function unlockScroll(): void {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

/**
 * Convierte el elemento referenciado en un diálogo modal:
 * foco inicial, foco atrapado, Escape y devolución del foco.
 *
 * La pila permite diálogos anidados: solo el superior responde al teclado.
 */
export function useModalFocus<T extends HTMLElement>(onEscape?: () => void, active = true) {
  const ref = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  const restoreEpoch = useRef(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  escapeRef.current = onEscape;

  useEffect(() => {
    const panel = ref.current;
    if (!active || !panel) return;

    const previousFocus =
      previousFocusRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    previousFocusRef.current = previousFocus;
    const epoch = ++restoreEpoch.current;
    dialogStack.push(panel);
    lockScroll();

    const initial =
      panel.querySelector<HTMLElement>("[data-autofocus]") ?? focusableElements(panel)[0] ?? panel;
    if (initial === panel && !panel.hasAttribute("tabindex")) {
      panel.tabIndex = -1;
    }
    initial.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (dialogStack[dialogStack.length - 1] !== panel) return;

      if (event.key === "Escape") {
        if (!escapeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = focusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !panel.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !panel.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = dialogStack.indexOf(panel);
      if (index >= 0) dialogStack.splice(index, 1);
      unlockScroll();

      if (previousFocus) {
        window.setTimeout(() => {
          if (restoreEpoch.current !== epoch) return;
          if (previousFocus.isConnected) previousFocus.focus();
          previousFocusRef.current = null;
        }, 0);
      }
    };
  }, [active]);

  return ref;
}
