import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce
    .number()
    .int("PORT debe ser un número entero")
    .min(1, "PORT debe estar entre 1 y 65535")
    .max(65535, "PORT debe estar entre 1 y 65535")
    .default(3000),
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres").optional(),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN debe tener el formato 30m, 8h o 7d")
    .default("8h"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => ({
    variable: issue.path.join("."),
    message: issue.message,
  }));
  console.error(
    JSON.stringify({
      level: "error",
      message: "Configuración inválida",
      details: problems,
    }),
  );
  process.exit(1);
}

const env = parsed.data;

const corsOrigins = (env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const developmentJwtSecret = "alfred-development-secret-change-me-32";

if (!env.JWT_SECRET && env.NODE_ENV === "production") {
  console.error(
    JSON.stringify({
      level: "error",
      message: "JWT_SECRET es obligatorio en producción",
    }),
  );
  process.exit(1);
}

if (!env.JWT_SECRET && env.NODE_ENV === "development") {
  console.warn(
    JSON.stringify({
      level: "warn",
      message: "JWT_SECRET no configurado; se usa un secreto solo para desarrollo",
    }),
  );
}

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  corsOrigins,
  jwtSecret: env.JWT_SECRET ?? developmentJwtSecret,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
} as const;
