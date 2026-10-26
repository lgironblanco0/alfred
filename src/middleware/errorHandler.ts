import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors";
import { log } from "../logger";

interface BodyParserError {
  type?: string;
  status?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === "object" && error !== null && "type" in error;
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestId = response.locals.requestId;

  if (error instanceof HttpError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  if (isBodyParserError(error)) {
    if (error.type === "entity.parse.failed") {
      response.status(400).json({
        code: "INVALID_JSON",
        message: "El cuerpo de la petición no es JSON válido",
      });
      return;
    }

    if (error.type === "entity.too.large") {
      response.status(413).json({
        code: "PAYLOAD_TOO_LARGE",
        message: "El cuerpo de la petición es demasiado grande",
      });
      return;
    }

    if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
      response.status(415).json({
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Codificación del cuerpo no soportada",
      });
      return;
    }
  }

  log("error", "unhandled_error", {
    requestId,
    error: error instanceof Error ? error.message : "Error desconocido",
  });

  response.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Error interno",
  });
};
