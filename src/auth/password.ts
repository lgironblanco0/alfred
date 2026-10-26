import bcrypt from "bcryptjs";

const HASH_COST = 12;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, HASH_COST);
}

export function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
