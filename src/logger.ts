export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY = /password|passwd|token|authorization|secret|cookie|jwt/i;
const MAX_DEPTH = 4;
const MAX_STRING = 1000;

/**
 * Redacta claves sensibles antes de escribir un log.
 *
 * Es una red de seguridad, no una invitación a registrar cuerpos completos:
 * la disciplina sigue siendo no pasar datos personales ni credenciales.
 */
export function sanitizeLogFields(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogFields(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY.test(key)
        ? "[REDACTED]"
        : sanitizeLogFields(entry, depth + 1);
    }
    return result;
  }

  if (typeof value === "string" && value.length > MAX_STRING) {
    return `${value.slice(0, MAX_STRING)}…`;
  }

  return value;
}

const LEVEL_WEIGHT: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function currentLevel(): LogLevel | "silent" {
  const value = process.env.LOG_LEVEL;
  if (value === "debug" || value === "info" || value === "warn" || value === "error" || value === "silent") {
    return value;
  }
  return "info";
}

export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) {
    return;
  }

  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(sanitizeLogFields(fields) as Record<string, unknown>),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}
