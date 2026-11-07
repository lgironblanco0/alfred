import type { RequestHandler } from "express";
import { config } from "../config";

const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * La API solo devuelve JSON, así que puede usar la política más restrictiva.
 */
const API_POLICY = "default-src 'none'; frame-ancestors 'none'";

/**
 * El frontend compilado se sirve desde el mismo origen en producción.
 * Necesita cargar su propio JS y CSS; los estilos en línea vienen de React
 * (`style={{ ... }}`) y de los atributos `style` de dnd-kit.
 */
const APP_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
].join("; ");

/**
 * HSTS no se envía en local porque se sirve por HTTP.
 */
export const securityHeaders: RequestHandler = (request, response, next) => {
  for (const [name, value] of Object.entries(BASE_HEADERS)) {
    response.setHeader(name, value);
  }

  const isJsonEndpoint =
    request.path.startsWith("/api/") || request.path === "/health" || request.path === "/ready";
  response.setHeader("Content-Security-Policy", isJsonEndpoint ? API_POLICY : APP_POLICY);

  if (config.isProduction) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (request.path.startsWith("/api/auth/")) {
    response.setHeader("Cache-Control", "no-store");
  }

  next();
};
