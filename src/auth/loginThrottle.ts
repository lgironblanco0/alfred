import { HttpError } from "../errors";

export interface LoginThrottleOptions {
  maxAttempts?: number;
  windowMs?: number;
  now?: () => number;
}

interface AttemptBucket {
  count: number;
  resetAt: number;
}

/**
 * Limita los intentos de acceso por clave (en la ruta se usa `ip + código`).
 *
 * El reloj es inyectable para poder probar la caducidad de la ventana sin
 * esperar quince minutos reales.
 */
export class LoginThrottle {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly attempts = new Map<string, AttemptBucket>();

  constructor(options: LoginThrottleOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.windowMs = options.windowMs ?? 15 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  assertAllowed(key: string): void {
    const now = this.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 0, resetAt: now + this.windowMs });
      return;
    }

    if (current.count >= this.maxAttempts) {
      throw new HttpError(429, "Demasiados intentos de acceso. Espera unos minutos.", {
        code: "TOO_MANY_ATTEMPTS",
      });
    }
  }

  recordFailure(key: string): void {
    const now = this.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    current.count += 1;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  size(): number {
    return this.attempts.size;
  }

  /** Elimina las claves cuya ventana ya venció para no acumular memoria. */
  prune(): void {
    const now = this.now();

    for (const [key, bucket] of this.attempts) {
      if (bucket.resetAt <= now) {
        this.attempts.delete(key);
      }
    }
  }
}

export const loginThrottle = new LoginThrottle();
