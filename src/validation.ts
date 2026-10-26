import { z } from "zod";
import { HttpError } from "./errors";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const details: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "body",
      message: issue.message,
    }));

    throw new HttpError(400, "Datos de entrada no válidos", {
      code: "VALIDATION_ERROR",
      details,
    });
  }

  return result.data;
}
