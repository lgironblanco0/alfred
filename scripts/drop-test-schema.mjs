import { PrismaClient } from "@prisma/client";

const schema = process.argv[2];
if (!schema || !/^alfred_test_[a-f0-9]+$/.test(schema)) throw new Error("Schema de pruebas inválido");
const prisma = new PrismaClient();
try {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
} finally {
  await prisma.$disconnect();
}
