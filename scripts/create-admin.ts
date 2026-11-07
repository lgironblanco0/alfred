import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PASSWORD_MIN_LENGTH, hashPassword } from "../src/auth/password";

/**
 * Crea o actualiza el primer administrador en una instalación nueva.
 *
 * Se usa en producción en lugar del seed de demostración, que crea códigos
 * predecibles (`0`–`13`). El código de acceso debe ser largo: hoy es la única
 * credencial de entrada.
 *
 * Uso:
 *   $env:ALFRED_ADMIN_CODIGO="un-codigo-largo-y-secreto"
 *   $env:ALFRED_ADMIN_EMAIL="gerente@restaurante.com"
 *   $env:ALFRED_ADMIN_NOMBRE="Nombre Apellido"
 *   $env:ALFRED_ADMIN_PASSWORD="contraseña-de-al-menos-8-caracteres"
 *   npm run db:create-admin
 */

const CODIGO_MIN_LENGTH = 12;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Falta la variable de entorno ${name}.`);
    process.exit(1);
  }
  return value;
}

const codigo = requireEnv("ALFRED_ADMIN_CODIGO").toLowerCase();
const email = requireEnv("ALFRED_ADMIN_EMAIL").toLowerCase();
const nombre = requireEnv("ALFRED_ADMIN_NOMBRE");
const password = process.env.ALFRED_ADMIN_PASSWORD ?? "";

if (codigo.length < CODIGO_MIN_LENGTH) {
  console.error(`ALFRED_ADMIN_CODIGO debe tener al menos ${CODIGO_MIN_LENGTH} caracteres.`);
  process.exit(1);
}

if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`ALFRED_ADMIN_PASSWORD debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword(password);
  const usuario = await prisma.usuario.upsert({
    where: { codigo },
    update: { nombre, email, passwordHash, rol: "GERENTE", activo: true },
    create: { codigo, nombre, email, passwordHash, rol: "GERENTE", activo: true },
  });

  console.log(`Administrador listo: ${usuario.nombre} (${usuario.email}), rol ${usuario.rol}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
