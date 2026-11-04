import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import { asyncRoute } from "./asyncRoute";
import { config } from "./config";
import { getReadiness } from "./health";
import { log } from "./logger";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requireAuth, requireRole } from "./middleware/requireAuth";
import { securityHeaders } from "./middleware/securityHeaders";
import { authRouter } from "./routes/auth";
import { cajaRouter } from "./routes/caja";
import { historicoRouter } from "./routes/historico";
import { informesRouter } from "./routes/informes";
import { eventosRouter } from "./routes/eventos";
import { salaRouter } from "./routes/sala";
import { usuariosRouter } from "./routes/usuarios";

export const app = express();

const corsOptions: CorsOptions =
  config.corsOrigins.length > 0
    ? {
        origin: config.corsOrigins,
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
        exposedHeaders: ["X-Request-Id"],
      }
    : config.isProduction
      ? { origin: false }
      : {};

app.disable("x-powered-by");
app.use(requestId);
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.get(
  "/ready",
  asyncRoute(async (_request, response) => {
    const result = await getReadiness();

    if (result.status !== 200) {
      log("warn", "readiness_failed", { database: "error" });
    }

    response.status(result.status).json(result.body);
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/usuarios", requireAuth, requireRole("GERENTE"), usuariosRouter);
app.use("/api/historico", requireAuth, requireRole("ENCARGADO", "GERENTE"), historicoRouter);
app.use("/api/informes", requireAuth, requireRole("ENCARGADO", "GERENTE"), informesRouter);
app.use("/api/eventos", eventosRouter);
app.use("/api/caja", requireAuth, requireRole("ENCARGADO", "GERENTE"), cajaRouter);
app.use("/api", salaRouter);

app.use(notFound);
app.use(errorHandler);
