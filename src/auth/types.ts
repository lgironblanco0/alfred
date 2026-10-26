import type { Usuario } from "@prisma/client";

export type UsuarioAutenticado = Pick<
  Usuario,
  "id" | "nombre" | "email" | "rol" | "activo"
>;

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export {};
