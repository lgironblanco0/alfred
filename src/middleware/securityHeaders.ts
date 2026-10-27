import type { RequestHandler } from "express";
import { config } from "../config";

const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

/**
 * La API solo devuelve JSON, así que la política puede ser restrictiva.
 * HSTS no se envía en local porque se sirve por HTTP.
 */
export const securityHeaders: RequestHandler = (request, response, next) => {
  for (const [name, value] of Object.entries(BASE_HEADERS)) {
    response.setHeader(name, value);
  }

  if (config.isProduction) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (request.path.startsWith("/api/auth/")) {
    response.setHeader("Cache-Control", "no-store");
  }

  next();
};
