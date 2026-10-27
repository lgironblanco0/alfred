import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { describe, it } from "node:test";
import { HttpError } from "../src/errors.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

process.env.LOG_LEVEL = "silent";

interface FakeResponse {
  response: Response;
  nextCalls: unknown[];
  body: () => unknown;
  statusCode: () => number;
}

function createResponse(options: { headersSent?: boolean } = {}): FakeResponse {
  const state = {
    status: 200,
    body: undefined as unknown,
    headersSent: options.headersSent ?? false,
  };

  const response = {
    get headersSent() {
      return state.headersSent;
    },
    locals: { requestId: "prueba" },
    status(code: number) {
      state.status = code;
      return response;
    },
    json(payload: unknown) {
      state.body = payload;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    nextCalls: [],
    body: () => state.body,
    statusCode: () => state.status,
  };
}

function run(error: unknown, options: { headersSent?: boolean } = {}) {
  const fake = createResponse(options);
  const next = ((received: unknown) => {
    fake.nextCalls.push(received);
  }) as NextFunction;

  errorHandler(error, {} as Request, fake.response, next);
  return fake;
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

describe("manejador de errores canónicos", () => {
  it("usa el código por defecto del status cuando el error no lo define", () => {
    const result = run(new HttpError(404, "Servicio no encontrado"));

    assert.equal(result.statusCode(), 404);
    assert.deepEqual(result.body(), {
      code: "NOT_FOUND",
      message: "Servicio no encontrado",
    });
  });

  it("respeta el código explícito del error", () => {
    const result = run(new HttpError(401, "Sesión no válida", { code: "INVALID_TOKEN" }));

    assert.deepEqual(result.body(), {
      code: "INVALID_TOKEN",
      message: "Sesión no válida",
    });
  });

  it("incluye details cuando aportan información", () => {
    const details = [{ path: "pax", message: "expected number" }];
    const result = run(new HttpError(400, "Datos de entrada no válidos", { details }));

    assert.deepEqual(result.body(), {
      code: "BAD_REQUEST",
      message: "Datos de entrada no válidos",
      details,
    });
  });

  it("no añade la clave details cuando no hay información", () => {
    const result = run(new HttpError(409, "Mesa ocupada"));
    const body = result.body() as Record<string, unknown>;

    assert.equal("details" in body, false);
  });

  it("cumple el patrón de code en todos los errores HTTP", () => {
    const casos = [
      new HttpError(400, "mal"),
      new HttpError(401, "sin sesión", { code: "INVALID_TOKEN" }),
      new HttpError(403, "prohibido", { code: "FORBIDDEN" }),
      new HttpError(404, "no existe"),
      new HttpError(409, "conflicto"),
      new HttpError(429, "tranquilo", { code: "TOO_MANY_ATTEMPTS" }),
    ];

    for (const caso of casos) {
      const body = run(caso).body() as { code: string; message: string };
      assert.match(body.code, CODE_PATTERN);
      assert.ok(body.message.length > 0);
    }
  });

  it("traduce un JSON roto a INVALID_JSON", () => {
    const result = run(Object.assign(new Error("Unexpected token"), { type: "entity.parse.failed" }));

    assert.equal(result.statusCode(), 400);
    assert.deepEqual(result.body(), {
      code: "INVALID_JSON",
      message: "El cuerpo de la petición no es JSON válido",
    });
  });

  it("traduce un cuerpo demasiado grande a PAYLOAD_TOO_LARGE", () => {
    const result = run(Object.assign(new Error("too large"), { type: "entity.too.large" }));

    assert.equal(result.statusCode(), 413);
    assert.equal((result.body() as { code: string }).code, "PAYLOAD_TOO_LARGE");
  });

  it("traduce un charset no soportado a UNSUPPORTED_MEDIA_TYPE", () => {
    const result = run(Object.assign(new Error("charset"), { type: "charset.unsupported" }));

    assert.equal(result.statusCode(), 415);
    assert.equal((result.body() as { code: string }).code, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("oculta el mensaje interno en un error inesperado", () => {
    const result = run(new Error("SELECT * FROM Usuario falló en dev.db"));

    assert.equal(result.statusCode(), 500);
    assert.deepEqual(result.body(), {
      code: "INTERNAL_ERROR",
      message: "Error interno",
    });
    assert.doesNotMatch(JSON.stringify(result.body()), /SELECT|dev\.db/);
  });

  it("delega en next si la respuesta ya empezó a enviarse", () => {
    const error = new Error("tarde");
    const result = run(error, { headersSent: true });

    assert.deepEqual(result.nextCalls, [error]);
    assert.equal(result.body(), undefined);
  });
});
