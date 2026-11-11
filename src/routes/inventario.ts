import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../asyncRoute";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import * as inventario from "../inventario/service";
import { parseInput } from "../validation";

export const inventarioRouter = Router();
const id = z.object({ id: z.coerce.number().int().positive() });
const requestBody = z.object({ items: z.array(z.object({ itemId: z.number().int().positive(), cantidad: z.number().int().positive() })).min(1) });
const restockBody = z.object({ cantidad: z.number().int().positive() });

inventarioRouter.get("/inventario", requireAuth, asyncRoute(async (_req, res) => { res.json({ items: await inventario.list() }); }));
inventarioRouter.post("/inventario/solicitudes", requireAuth, asyncRoute(async (req, res) => {
  const body = parseInput(requestBody, req.body);
  res.status(201).json(await inventario.requestItems(body.items, req.usuario!.id));
}));
inventarioRouter.post("/inventario/:id/reponer", requireAuth, requireRole("GERENTE"), asyncRoute(async (req, res) => {
  const { id: itemId } = parseInput(id, req.params);
  const { cantidad } = parseInput(restockBody, req.body);
  res.json(await inventario.restock(itemId, cantidad));
}));
