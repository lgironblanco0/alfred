# Pruebas aisladas — Bloque 2.1

Cómo se ejecutan las pruebas sin tocar la base de datos de desarrollo.

Escrito antes del código.

---

## 1. Problema

Hasta ahora `npm test` arrancaba la API contra `prisma/dev.db`, la misma base con la que se trabaja y se enseña la app. Eso tiene tres consecuencias:

1. **Las pruebas pueden ensuciar datos reales.** Un test que abre una mesa modifica la sala que el usuario ve.
2. **El resultado depende del estado.** La prueba de `409` se salta si no hay mesas ocupadas; la de auditoría no puede comprobar el actor porque exigiría escribir.
3. **No se puede borrar y recrear.** Cualquier prueba destructiva da miedo.

La solución estándar es una **base desechable**: se crea una copia temporal, se migra, se siembra, se ejecutan las pruebas y se borra.

---

## 2. Diseño

```text
npm test
  └─ node scripts/test-with-db.mjs
       1. crea una carpeta temporal fuera del repositorio
       2. DATABASE_URL = file:<tmp>/test-<aleatorio>.db
       3. prisma migrate deploy   → esquema completo
       4. prisma db seed          → 8 empleados, mesas y carta de demostración
       5. tsx --test tests/**/*.test.ts
       6. borra la carpeta (también si las pruebas fallan)
```

**Decisión T-1 — La URL de la base se lee de `DATABASE_URL`.**
`prisma/schema.prisma` deja de tener `file:./dev.db` fijo y usa `env("DATABASE_URL")`. El archivo `.env.example` declara `DATABASE_URL="file:./dev.db"`, que es el valor de desarrollo. Así el mismo esquema sirve para desarrollo y para la base temporal, sin mantener dos esquemas.

**Decisión T-2 — La base temporal vive fuera del repositorio.**
Se crea en el directorio temporal del sistema con un nombre aleatorio (`alfred-test-XXXX/test.db`). No aparece en git, no entra en las copias de seguridad y no se confunde con `dev.db`.

**Decisión T-3 — Un proceso, una base.**
Los archivos de prueba se ejecutan en paralelo, pero comparten la misma base temporal. Las pruebas que necesitan una mesa libre **crean una mesa propia** (`createTable: true`) en lugar de depender de un número fijo. Las que necesitan estado concreto lo construyen por API.

**Decisión T-4 — Limpieza garantizada, con opción de depurar.**
La carpeta temporal se borra en un bloque `finally`. Si se define `ALFRED_TEST_KEEP_DB=1`, se conserva y se imprime la ruta para inspeccionarla.

**Decisión T-5 — `npm run verify` no cambia.**
Sigue ejecutando typecheck, builds y `npm test`. Lo único que cambia es que `npm test` ya no apunta a `dev.db`.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | `npm test` no modifica `prisma/dev.db` | Hash del archivo antes y después |
| CA-2 | La base temporal se migra y se siembra antes de las pruebas | Salida del runner + pruebas que usan códigos `0`–`7` |
| CA-3 | La carpeta temporal se borra al terminar, incluso con fallos | Inspección del directorio temporal |
| CA-4 | Abrir dos veces la misma mesa devuelve `409 CONFLICT` sin depender del seed | `tests/integration.test.ts` |
| CA-5 | Añadir un producto registra un evento `PEDIDO` con el actor autenticado | `tests/integration.test.ts` |
| CA-6 | El modo de desarrollo sigue usando `prisma/dev.db` | `prisma migrate status` + arranque manual |

---

## 4. Alcance

### Entra

- `DATABASE_URL` como fuente de la conexión.
- Script `scripts/test-with-db.mjs`.
- `npm test` apuntando al script.
- Dos pruebas de integración deterministas: `409` y actor del evento.
- Documentación y `.env.example`.

### No entra

| Tema | Fase |
|---|---|
| Navegador automatizado (Playwright) | 2.2 |
| Base distinta por archivo de prueba | 2.2 si hace falta |
| Docker o Postgres de pruebas | 5 |
| Migraciones automáticas en producción | 5 |

---

## 5. Definición de terminado

- [x] Especificación escrita.
- [x] `DATABASE_URL` en esquema, `.env.example` y `.env` local.
- [x] Script de base temporal con migración, seed y limpieza.
- [x] `npm test` usa la base temporal.
- [x] Pruebas de `409` y actor deterministas.
- [x] `npm run verify` en verde.
- [x] `dev.db` conserva su hash tras las pruebas.
- [x] Documento enlazado y plan actualizado.

### 5.1. Evidencia

```text
Base de pruebas: file:C:/Users/.../Temp/alfred-test-XXXX/test.db
> prisma migrate deploy   → All migrations have been successfully applied.
> prisma db seed          → 8 empleados, mesas y carta
> pruebas                → 78/78 en verde
hash de prisma/dev.db antes  = 7A76...
hash de prisma/dev.db después = 7A76...
iguales: True
```

- `scripts/test-with-db.mjs`: crear → migrar → sembrar → probar → borrar.
- `tests/integration.test.ts`: 3 pruebas deterministas (409, actor en `PEDIDO`, actor en `APERTURA`).
- Se conserva la base con `ALFRED_TEST_KEEP_DB=1` solo para depurar.

**Incidencia encontrada y corregida:** tras cambiar el esquema a `env("DATABASE_URL")` hay que ejecutar `prisma generate`. Sin hacerlo, las migraciones iban a la base temporal pero el cliente generado seguía apuntando a `dev.db`, y el seed escribía en desarrollo. La sesión de trabajo quedó con el seed reaplicado sobre `dev.db` (idempotente, sin pérdida de datos); las copias de `prisma/backups/` siguen intactas.

---

## 6. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 2.1 | Especificación de base desechable y pruebas aisladas |
| 2026-10-27 | 2.1 | `DATABASE_URL`, runner temporal, 3 pruebas deterministas y 78/78 en verde |
