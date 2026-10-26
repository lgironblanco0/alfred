import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config";

const ALGORITHM = "HS256" as const;

export function signToken(userId: number): string {
  return jwt.sign({}, config.jwtSecret, {
    algorithm: ALGORITHM,
    subject: String(userId),
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): number {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Token sin sujeto");
  }

  const userId = Number(payload.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Sujeto de token inválido");
  }

  return userId;
}
