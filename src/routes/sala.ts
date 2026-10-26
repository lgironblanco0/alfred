import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../asyncRoute";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { serializeServicio } from "../sala/serialize";
import * as sala from "../sala/service";
import { parseInput } from "../validation";

export const salaRouter = Router();

const idParams = z.object({
  id: z.coerce.number().int("El identificador debe ser entero").positive("El identificador debe ser positivo"),
});

const walkInBody = z.object({
  mesaId: z.coerce.number().int().positive().optional(),
  zona: z.enum(["RESTAURANTE", "TERRAZA", "BARRA"]).optional(),
  clase: z.enum(["MESA", "PUNTO_BARRA"]).optional(),
  pax: z.coerce.number().int("pax debe ser entero").positive("pax debe ser mayor que cero"),
  createTable: z.boolean().optional(),
});

const paxBody = z.object({
  pax: z.coerce.number().int("pax debe ser entero").positive("pax debe ser mayor que cero"),
});

const mergeBody = z.object({
  mesaIds: z.array(z.coerce.number().int().positive()).max(50, "Demasiadas mesas en una sola unión").optional(),
});

const cancelBody = z.object({
  motivo: z.string().trim().max(500, "El motivo es demasiado largo").optional(),
});

const itemBody = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().positive().max(100, "Cantidad demasiado alta").optional(),
  numeroAsiento: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  esCompartido: z.boolean().optional(),
});

const callBody = z.object({
  lineaIds: z.array(z.coerce.number().int().positive()).max(500, "Demasiadas líneas").optional(),
});

const anularBody = z.object({
  motivo: z.string().trim().min(1, "Indica el motivo de anulación").max(500, "El motivo es demasiado largo"),
});

const promoBody = z.object({
  codigo: z.string().trim().max(50, "El código es demasiado largo").optional(),
});

const splitBody = z.object({
  splitModo: z.enum(["NINGUNO", "IGUAL", "ASIENTO"]).optional(),
});

const layoutBody = z.object({
  items: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        layoutOrder: z.coerce.number().int().min(0),
      }),
    )
    .max(500, "Demasiadas mesas")
    .optional(),
});

salaRouter.get(
  "/sala",
  asyncRoute(async (_request, response) => {
    response.json(await sala.getSala());
  }),
);

salaRouter.post(
  "/servicios",
  asyncRoute(async (request, response) => {
    const input = parseInput(walkInBody, request.body);
    const servicio = await sala.createWalkIn({ ...input, actorId: request.usuario?.id });
    response.status(201).json(serializeServicio(servicio));
  }),
);

salaRouter.patch(
  "/servicios/:id/pax",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { pax } = parseInput(paxBody, request.body);
    const servicio = await sala.expandPax(id, pax, request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/merge",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { mesaIds } = parseInput(mergeBody, request.body);
    const servicio = await sala.mergeMesas(id, mesaIds ?? [], request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/cancel",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { motivo } = parseInput(cancelBody, request.body);
    const servicio = await sala.cancelServicio(id, motivo ?? "", request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/items",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(itemBody, request.body);
    const servicio = await sala.addItem({
      servicioId: id,
      productoId: input.productoId,
      cantidad: input.cantidad,
      numeroAsiento: input.numeroAsiento,
      esCompartido: input.esCompartido,
    });
    response.status(201).json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/call",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { lineaIds } = parseInput(callBody, request.body);
    const servicio = await sala.callItems(id, lineaIds, request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/lineas/:id/ready",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const servicio = await sala.markReady(id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/lineas/:id/anular",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { motivo } = parseInput(anularBody, request.body);
    const servicio = await sala.removeItem(id, motivo, request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/promo",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { codigo } = parseInput(promoBody, request.body);
    const servicio = await sala.applyPromo(id, codigo ?? "", request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/split",
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const { splitModo } = parseInput(splitBody, request.body);
    const servicio = await sala.setSplit(id, splitModo ?? "NINGUNO");
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.post(
  "/servicios/:id/pagar",
  requireAuth,
  requireRole("ENCARGADO", "GERENTE"),
  asyncRoute(async (request, response) => {
    const { id } = parseInput(idParams, request.params);
    const servicio = await sala.payServicio(id, request.usuario?.id);
    response.json(serializeServicio(servicio));
  }),
);

salaRouter.patch(
  "/mesas/layout",
  asyncRoute(async (request, response) => {
    const { items } = parseInput(layoutBody, request.body);
    response.json(await sala.reorderMesas(items ?? []));
  }),
);
