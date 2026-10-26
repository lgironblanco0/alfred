import type { NextFunction, Request, Response } from "express";

type Handler = (request: Request, response: Response, next: NextFunction) => Promise<void> | void;

export function asyncRoute(handler: Handler) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
