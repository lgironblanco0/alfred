import type { NextFunction, Request, Response } from "express";
import "../auth/types";
import { log } from "../logger";

export function requestLogFields(
  request: Pick<Request, "method" | "path" | "usuario">,
  response: Pick<Response, "locals" | "statusCode">,
  durationMs: number,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    requestId: response.locals.requestId,
    method: request.method,
    path: request.path,
    status: response.statusCode,
    durationMs: Math.round(durationMs * 100) / 100,
  };

  if (request.usuario) {
    fields.userId = request.usuario.id;
    fields.role = request.usuario.rol;
  }

  return fields;
}

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = response.statusCode >= 500 ? "error" : response.statusCode >= 400 ? "warn" : "info";

    log(level, "request", requestLogFields(request, response, durationMs));
  });

  next();
}
