import type { RequestHandler } from "express";
import { verifyToken } from "../auth/tokens";
import "../auth/types";
import { prisma } from "../db";
import { HttpError } from "../errors";

const USUARIO_SELECT = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
} as const;

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const header = request.header("authorization");

    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "Autenticación requerida", { code: "UNAUTHORIZED" });
    }

    const token = header.slice("Bearer ".length).trim();
    const userId = verifyToken(token);
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: USUARIO_SELECT,
    });

    if (!usuario || !usuario.activo) {
      throw new HttpError(401, "Sesión no válida", { code: "UNAUTHORIZED" });
    }

    request.usuario = usuario;
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(401, "Token no válido o caducado", { code: "INVALID_TOKEN" }));
  }
};

export function requireRole(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.usuario) {
      next(new HttpError(401, "Autenticación requerida", { code: "UNAUTHORIZED" }));
      return;
    }

    if (!roles.includes(request.usuario.rol)) {
      next(
        new HttpError(403, "No tienes permiso para esta acción", {
          code: "FORBIDDEN",
        }),
      );
      return;
    }

    next();
  };
}
