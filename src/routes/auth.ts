import { Router } from "express";
import { z } from "zod";
import { loginThrottle } from "../auth/loginThrottle";
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
  return prisma.usuario.findUnique({ where: { codigo } });
}

function loginKey(request: { ip?: string }, codigo: string): string {
  return `${request.ip ?? "desconocida"}:${codigo}`;
}

function publicUser(usuario: {
  id: number;
  codigo: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}) {
  return {
    id: usuario.id,
    codigo: usuario.codigo,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncRoute(async (request, response) => {
    const input = parseInput(loginBody, request.body);
    const key = loginKey(request, input.codigo);

    if (loginThrottle.size() > 500) {
      loginThrottle.prune();
    }

    loginThrottle.assertAllowed(key);

    const usuario = await findUsuarioPorCodigo(input.codigo);

    if (!usuario || !usuario.activo) {
      loginThrottle.recordFailure(key);
      throw new HttpError(401, "Código de empleado no válido", {
        code: "INVALID_CREDENTIALS",
      });
    }

    loginThrottle.reset(key);

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
