import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../asyncRoute";
import * as historico from "../historico/service";
import { parseInput } from "../validation";

export const historicoRouter = Router();

const idParams = z.object({
  id: z.coerce.number().int("El identificador debe ser entero").positive("El identificador debe ser positivo"),
});

const dateSchema = z.string().datetime({ offset: true, message: "Fecha ISO no válida" });

const listQuery = z
  .object({
    desde: dateSchema.optional(),
    hasta: dateSchema.optional(),
    estado: z.enum(["PAGADA", "CANCELADA"]).optional(),
    limit: z.coerce
      .number()
      .int("limit debe ser entero")
      .min(1, "limit debe ser al menos 1")
      .max(100, "limit no puede superar 100")
      .optional(),
    offset: z.coerce
      .number()
      .int("offset debe ser entero")
      .min(0, "offset no puede ser negativo")
      .optional(),
  })
  .refine(
    (value) => !value.desde || !value.hasta || new Date(value.desde) <= new Date(value.hasta),
    { message: "La fecha inicial no puede ser posterior a la final", path: ["desde"] },
  );

historicoRouter.get(
  "/",
  asyncRoute(async (request, response) => {
    const query = parseInput(listQuery, request.query);
    response.json(
      await historico.listHistorico({
        desde: query.desde ? new Date(query.desde) : undefined,
        hasta: query.hasta ? new Date(query.hasta) : undefined,
        estado: query.estado,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      }),
    );
  }),
);

historicoRouter.get(
  "/:id",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    response.json({ servicio: await historico.getHistoricoServicio(id) });
  }),
);
