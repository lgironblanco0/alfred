import type { NextFunction, Request, Response } from "express";
import { log } from "../logger";

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const level = response.statusCode >= 500 ? "error" : response.statusCode >= 400 ? "warn" : "info";

    log(level, "request", {
      requestId: response.locals.requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
}
