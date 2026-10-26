import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requireAuth, requireRole } from "./middleware/requireAuth";
import { authRouter } from "./routes/auth";
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
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/usuarios", requireAuth, requireRole("GERENTE"), usuariosRouter);
app.use("/api", salaRouter);

app.use(notFound);
app.use(errorHandler);
