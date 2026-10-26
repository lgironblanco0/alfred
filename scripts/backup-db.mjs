import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const backupDir = "prisma/backups";
const source = "prisma/dev.db";
const keep = 20;

function stamp(date) {
  const pad = (value) => value.toString().padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

mkdirSync(backupDir, { recursive: true });

const target = join(backupDir, `dev-${stamp(new Date())}.db`);
copyFileSync(source, target);

const backups = readdirSync(backupDir)
  .filter((name) => /^dev-\d{8}-\d{6}\.db$/.test(name))
  .sort();

for (const name of backups.slice(0, Math.max(0, backups.length - keep))) {
  unlinkSync(join(backupDir, name));
  console.log(`Copia antigua eliminada: ${name}`);
}

console.log(`Copia creada: ${target} (${statSync(target).size} bytes)`);
