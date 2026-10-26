import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header("x-request-id");
  const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

  response.locals.requestId = id;
  response.setHeader("x-request-id", id);
  next();
}
