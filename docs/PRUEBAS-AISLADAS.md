# Pruebas aisladas — Bloque 2.1

Cómo se ejecutan las pruebas sin tocar los datos de desarrollo.

Escrito antes del código.

> **Actualizado el 2026-11-07:** la base de datos pasó de SQLite a PostgreSQL. El aislamiento
> ya no se consigue con un archivo temporal, sino con un **schema temporal** dentro del mismo
> servidor PostgreSQL. El resto del diseño se mantiene.

---

## 1. Problema

Hasta ahora `npm test` arrancaba la API contra la base de desarrollo, la misma con la que se
trabaja y se enseña la app. Eso tiene tres consecuencias:

1. **Las pruebas pueden ensuciar datos reales.** Un test que abre una mesa modifica la sala que el usuario ve.
2. **El resultado depende del estado.** La prueba de `409` se salta si no hay mesas ocupadas; la de auditoría no puede comprobar el actor porque exigiría escribir.
3. **No se puede borrar y recrear.** Cualquier prueba destructiva da miedo.

La solución estándar es una **base desechable**: se crea un entorno temporal, se migra, se
siembra, se ejecutan las pruebas y se borra.

---

## 2. Diseño

```text
npm test
  └─ node scripts/test-with-db.mjs
       1. lee DATABASE_URL del .env
       2. DATABASE_URL = misma conexión, con ?schema=alfred_test_<aleatorio>
       3. prisma migrate deploy   → esquema completo en ese schema
       4. prisma db seed          → empleados, mesas y carta de demostración
       5. tsx --test tests/**/*.test.ts
       6. DROP SCHEMA ... CASCADE (también si las pruebas fallan)
```

**Decisión T-1 — La URL de la base se lee de `DATABASE_URL`.**
`prisma/schema.prisma` usa `env("DATABASE_URL")`. El archivo `.env.example` declara la conexión
de PostgreSQL de desarrollo. Así el mismo esquema sirve para desarrollo y para el entorno
temporal, sin mantener dos esquemas.

**Decisión T-2 — El aislamiento se hace con un schema, no con un archivo.**
Cada ejecución crea un schema PostgreSQL aleatorio (`alfred_test_<hex>`) en la misma base. Los
datos de desarrollo viven en el schema `public`, así que las pruebas no pueden tocarlos. Al
terminar, `scripts/drop-test-schema.mjs` ejecuta `DROP SCHEMA ... CASCADE`.

**Decisión T-3 — Un proceso, una base.**
Los archivos de prueba comparten el mismo schema temporal y se ejecutan **en serie**
(`--test-concurrency=1`). Las pruebas que necesitan una mesa libre **crean una mesa propia**
(`createTable: true`) en lugar de depender de un número fijo. Las que necesitan estado concreto
lo construyen por API.

> Actualizado en 2.3: al añadir más archivos que crean mesas, el paralelismo produjo carreras al
> calcular el siguiente `numeroMesa`. La suite pasó a ejecutarse en serie.

**Decisión T-4 — Limpieza garantizada, con opción de depurar.**
El schema temporal se borra en un bloque `finally`. Si se define `ALFRED_TEST_KEEP_DB=1`, se
conserva para inspeccionarlo.

**Decisión T-5 — `npm run verify` no cambia.**
Sigue ejecutando typecheck, builds y `npm test`. Lo único que cambia es que `npm test` ya no
apunta a los datos de desarrollo.

**Decisión T-6 — Los scripts cargan el `.env`.**
`scripts/test-with-db.mjs` y `scripts/e2e-with-db.mjs` importan `dotenv/config`. Sin eso, el
proceso de pruebas no ve `DATABASE_URL` aunque el servidor sí la lea.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | `npm test` no modifica los datos de desarrollo | Inspección del schema `public` antes y después |
| CA-2 | El schema temporal se migra y se siembra antes de las pruebas | Salida del runner + pruebas que usan códigos de empleado |
| CA-3 | El schema temporal se borra al terminar, incluso con fallos | `\dn` en psql o `scripts/drop-test-schema.mjs` |
| CA-4 | Abrir dos veces la misma mesa devuelve `409 CONFLICT` sin depender del seed | `tests/integration.test.ts` |
| CA-5 | Añadir un producto registra un evento `PEDIDO` con el actor autenticado | `tests/integration.test.ts` |
| CA-6 | El modo de desarrollo sigue usando el schema `public` de PostgreSQL | `prisma migrate status` + arranque manual |

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
- [x] Script de entorno temporal con migración, seed y limpieza.
- [x] `npm test` usa el schema temporal.
- [x] Pruebas de `409` y actor deterministas.
- [x] `npm run verify` en verde.
- [x] Los datos de desarrollo permanecen intactos tras las pruebas.
- [x] Documento enlazado y plan actualizado.

### 5.1. Evidencia

```text
Base de pruebas: postgresql://...?schema=alfred_test_a8b022e3040e
> prisma migrate deploy   → All migrations have been successfully applied.
> prisma db seed          → empleados, mesas y carta
> pruebas                → en verde
> e2e                   → 11/11 en verde
> limpieza del schema de pruebas
```

- `scripts/test-with-db.mjs`: crear schema → migrar → sembrar → probar → borrar.
- `tests/integration.test.ts`: 3 pruebas deterministas (409, actor en `PEDIDO`, actor en `APERTURA`).
- Se conserva el schema con `ALFRED_TEST_KEEP_DB=1` solo para depurar.

**Incidencia encontrada y corregida:** los scripts de prueba no cargaban el `.env`, así que
`DATABASE_URL` llegaba vacía y la suite abortaba con «Las pruebas necesitan DATABASE_URL
PostgreSQL en .env». Se resolvió importando `dotenv/config` al inicio de cada script.

---

## 6. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 2.1 | Especificación de base desechable y pruebas aisladas |
| 2026-10-27 | 2.1 | `DATABASE_URL`, runner temporal, 3 pruebas deterministas y 78/78 en verde |
| 2026-11-07 | 2.1 | Migración a PostgreSQL: schema temporal en lugar de archivo; scripts cargan `.env` |
