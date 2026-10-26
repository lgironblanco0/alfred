import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../auth/password";
import { asyncRoute } from "../asyncRoute";
import { prisma } from "../db";
import { HttpError } from "../errors";
import { parseInput } from "../validation";

const rolSchema = z.enum(["CAMARERO", "ENCARGADO", "GERENTE"]);

const emailSchema = z
  .string()
  .trim()
  .email("Email no válido")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`);

const idParams = z.object({
  id: z.coerce.number().int().positive("El identificador debe ser positivo"),
});

const createBody = z.object({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(100, "El nombre es demasiado largo"),
  email: emailSchema,
  password: passwordSchema,
  rol: rolSchema,
});

const updateBody = z
  .object({
    nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(100, "El nombre es demasiado largo").optional(),
    rol: rolSchema.optional(),
    activo: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Indica al menos un cambio",
  });

const passwordBody = z.object({
  password: passwordSchema,
});

const publicUserSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
} as const;

async function findUserOrFail(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw new HttpError(404, "Usuario no encontrado");
  }
  return usuario;
}

async function assertManagerRemains(
  target: { id: number; rol: string; activo: boolean },
  nextRol?: string,
  nextActivo?: boolean,
): Promise<void> {
  const isManagerNow = target.rol === "GERENTE" && target.activo;
  const staysManager = (nextRol ?? target.rol) === "GERENTE" && (nextActivo ?? target.activo);

  if (!isManagerNow || staysManager) {
    return;
  }

  const activeManagers = await prisma.usuario.count({
    where: { rol: "GERENTE", activo: true },
  });

  if (activeManagers <= 1) {
    throw new HttpError(409, "No se puede dejar el sistema sin un gerente activo", {
      code: "LAST_MANAGER",
    });
  }
}

export const usuariosRouter = Router();

usuariosRouter.get(
  "/",
  asyncRoute(async (_request, response) => {
    const usuarios = await prisma.usuario.findMany({
      select: publicUserSelect,
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    response.json({ usuarios });
  }),
);

usuariosRouter.post(
  "/",
  asyncRoute(async (request, response) => {
    const input = parseInput(createBody, request.body);

    try {
      const usuario = await prisma.usuario.create({
        data: {
          nombre: input.nombre,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          rol: input.rol,
        },
        select: publicUserSelect,
      });

      response.status(201).json({ usuario });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "Ese email ya está registrado", { code: "EMAIL_IN_USE" });
      }
      throw error;
    }
  }),
);

usuariosRouter.patch(
  "/:id",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(updateBody, request.body);
    const target = await findUserOrFail(id);

    await assertManagerRemains(target, input.rol, input.activo);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: input.nombre,
        rol: input.rol,
        activo: input.activo,
      },
      select: publicUserSelect,
    });

    response.json({ usuario });
  }),
);

usuariosRouter.patch(
  "/:id/password",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { password } = parseInput(passwordBody, request.body);
    await findUserOrFail(id);

    await prisma.usuario.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });

    response.status(204).end();
  }),
);
