import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { signToken } from "../auth/tokens";
import { asyncRoute } from "../asyncRoute";
import { config } from "../config";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { parseInput } from "../validation";

const loginBody = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código de empleado es obligatorio")
    .max(80, "El código de empleado es demasiado largo")
    .transform((value) => value.toLowerCase()),
});

function findUsuarioPorCodigo(codigo: string) {
  if (codigo.includes("@")) {
    return prisma.usuario.findUnique({ where: { email: codigo } });
  }
  return prisma.usuario.findFirst({ where: { email: { startsWith: `${codigo}@` } } });
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function loginKey(request: Request, codigo: string): string {
  return `${request.ip ?? "desconocida"}:${codigo}`;
}

function assertLoginAllowed(key: string): void {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  if (current.count >= LOGIN_MAX_ATTEMPTS) {
    throw new HttpError(429, "Demasiados intentos de acceso. Espera unos minutos.", {
      code: "TOO_MANY_ATTEMPTS",
    });
  }
}

function recordLoginFailure(key: string): void {
  const current = attempts.get(key);
  if (current) {
    current.count += 1;
  }
}

function publicUser(usuario: {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncRoute(async (request, response) => {
    const input = parseInput(loginBody, request.body);
    const key = loginKey(request, input.codigo);

    assertLoginAllowed(key);

    const usuario = await findUsuarioPorCodigo(input.codigo);

    if (!usuario || !usuario.activo) {
      recordLoginFailure(key);
      throw new HttpError(401, "Código de empleado no válido", {
        code: "INVALID_CREDENTIALS",
      });
    }

    attempts.delete(key);

    response.json({
      token: signToken(usuario.id),
      expiresIn: config.jwtExpiresIn,
      usuario: publicUser(usuario),
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncRoute(async (request, response) => {
    response.json({ usuario: request.usuario });
  }),
);
