import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../asyncRoute";
import * as caja from "../caja/service";
import { parseInput } from "../validation";

export const cajaRouter = Router();

const importeSchema = z
  .number()
  .int("El importe debe estar en céntimos enteros")
  .min(0, "El importe no puede ser negativo")
  .max(100_000_000, "El importe es demasiado alto");

const abrirBody = z.object({
  fondoInicial: importeSchema,
});

const cerrarBody = z.object({
  efectivoContado: importeSchema,
  notas: z.string().trim().max(500, "Las notas son demasiado largas").optional(),
});

const sesionesQuery = z.object({
  limit: z.coerce
    .number()
    .int("limit debe ser entero")
    .min(1, "limit debe ser al menos 1")
    .max(50, "limit no puede superar 50")
    .optional(),
});

cajaRouter.get(
  "/",
  asyncRoute(async (_request, response) => {
    response.json(await caja.getCaja());
  }),
);

cajaRouter.post(
  "/abrir",
  asyncRoute(async (request, response) => {
    const { fondoInicial } = parseInput(abrirBody, request.body);
    const sesion = await caja.openCaja(fondoInicial, request.usuario?.id);
    response.status(201).json({ sesion });
  }),
);

cajaRouter.post(
  "/cerrar",
  asyncRoute(async (request, response) => {
    const { efectivoContado, notas } = parseInput(cerrarBody, request.body);
    response.json(await caja.closeCaja(efectivoContado, notas, request.usuario?.id));
  }),
);

cajaRouter.get(
  "/sesiones",
  asyncRoute(async (request, response) => {
    const { limit } = parseInput(sesionesQuery, request.query);
    response.json({ sesiones: await caja.listSesiones(limit ?? 10) });
  }),
);
