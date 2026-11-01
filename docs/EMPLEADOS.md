# Empleados y códigos individuales — Bloque 1.5

Cómo se identifica cada empleado en ALFRED y qué garantiza el sistema.

---

## 1. Problema

Hasta ahora el login usaba el prefijo del email:

```text
"2"  →  busca el primer usuario cuyo email empiece por "2@"
```

Eso funcionaba con tres usuarios de demostración, pero tenía dos defectos:

1. **No era único.** Dos usuarios con email `2@...` y `2-algo@...` habrían colisionado.
2. **No distinguía personas.** Todos los camareros compartían el código `2`, así que la auditoría del Bloque 1.4 decía siempre "Camareros".

---

## 2. Modelo

El campo `codigo` es **obligatorio y único** en `Usuario`:

```prisma
model Usuario {
  id     Int    @id @default(autoincrement())
  codigo String @unique
  nombre String
  email  String @unique
  rol    String @default("CAMARERO")
  ...
}
```

Reglas del código:

| Regla | Valor |
|---|---|
| Longitud | 1 a 20 caracteres |
| Formato | letras, números, `-` y `_` |
| Normalización | se guarda en minúsculas |
| Unicidad | garantizada por índice único en la base de datos |

---

## 3. Plantilla actual

Catorce empleados tras el seed (Fase 3):

| Código | Nombre | Rol |
|---|---|---|
| `0` | Gerente | GERENTE |
| `1` | Responsable | ENCARGADO |
| `2` | Camareros | CAMARERO |
| `3` | Lucía Ferrer | GERENTE |
| `4` | Marcos Peña | ENCARGADO |
| `5` | Ana Ruiz | CAMARERO |
| `6` | Diego Salas | CAMARERO |
| `7` | Nora Vidal | CAMARERO |
| `8` | Elena Vargas | GERENTE |
| `9` | Raúl Domínguez | ENCARGADO |
| `10` | Carmen Ortiz | CAMARERO |
| `11` | Iván Serrano | CAMARERO |
| `12` | Paula Méndez | CAMARERO |
| `13` | Hugo Navarro | CAMARERO |

**Decisión E-1 — Los códigos 0, 1 y 2 se mantienen.** Son los que el equipo conoce y con los que está documentada la app. Eliminarlos rompería el acceso sin aportar nada. Quedan como datos iniciales y su código `2` sigue siendo compartido: la app lo permite, pero **no distingue** entre camareros.

**Decisión E-2 — Los códigos 3–13 son individuales.** Con ellos la auditoría sí identifica a la persona. El nombre que aparece en el histórico es el del usuario autenticado.

**Decisión E-4 — Los empleados se desactivan, nunca se borran.** `activo = false` conserva eventos, actores e histórico. El servidor impide dejar el sistema sin ningún gerente activo.

**Decisión E-3 — Los nombres son de ejemplo.** Se pueden cambiar con el seed o desde la API de usuarios. El código es lo que importa para el login.

**Decisión E-4 — El login sigue aceptando email.** Si la entrada contiene `@`, se busca por email. Sirve para soporte y no estorba al flujo normal. El camino principal es el código.

---

## 4. Migración

La columna es `NOT NULL` y la tabla ya tenía filas. En SQLite no se puede añadir una columna obligatoria sin valor, así que la migración **reconstruye la tabla**:

1. Copia de seguridad: `npm run db:backup` → `prisma/backups/dev-20261027-200648.db`.
2. Se crea `new_Usuario` con la columna nueva.
3. Se copian los datos derivando el código del email: `substr(email, 1, instr(email, '@') - 1)`.
4. Se elimina la tabla vieja y se renombra la nueva.
5. Se crean los índices únicos de `codigo` y `email`.

Verificaciones tras aplicar:

- `prisma migrate status` → esquema al día.
- Los tres usuarios existentes conservan su código `0`, `1` y `2`.
- Los eventos históricos siguen apuntando a su actor (no se tocó `EventoServicio`).

**Lección:** una migración que añade una columna obligatoria sobre datos existentes no es un `ALTER TABLE` inocente. Hay que decidir de dónde sale el valor para cada fila antigua. Aquí se derivó del email, que ya codificaba el código.

---

## 5. Alta de empleados

Dos vías:

**Seed** (`prisma/seed.ts`): declara la plantilla y es idempotente. Se ejecuta con `npm run db:seed`.

**API** (`POST /api/usuarios`, solo gerente):

```json
{
  "codigo": "8",
  "nombre": "Nuevo Empleado",
  "email": "nuevo@alfred.local",
  "password": "contrasena-larga",
  "rol": "CAMARERO"
}
```

Errores previstos:

| Situación | Respuesta |
|---|---|
| Falta `codigo` | `400 VALIDATION_ERROR` con `path: "codigo"` |
| Código con espacios | `400 VALIDATION_ERROR` |
| Código repetido | `409 CODE_IN_USE` |
| Email repetido | `409 EMAIL_IN_USE` |

---

## 6. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | El código `3` inicia sesión y devuelve rol GERENTE | `tests/authz.test.ts` |
| CA-2 | Los códigos `0`, `1` y `2` siguen funcionando | `tests/authz.test.ts` |
| CA-3 | Dos camareros con códigos distintos devuelven identidades distintas | `tests/authz.test.ts` |
| CA-4 | El alta de empleado exige `codigo` | `tests/authz.test.ts` |
| CA-5 | Un código con formato inválido se rechaza | `tests/authz.test.ts` |
| CA-6 | Un código repetido devuelve `409 CODE_IN_USE` | `tests/authz.test.ts` |

---

## 7. Alcance

### Entra

- Campo `codigo` único con migración y copia previa.
- Seed con ocho empleados.
- Login por código individual.
- Alta y edición de empleados con código.

### No entra

| Tema | Fase |
|---|---|
| Retirar el código compartido `2` | 4 |
| PIN o contraseña obligatoria por empleado | 1.6 |
| Fichaje, turnos y disponibilidad | 3 |
| Histórico global filtrable por empleado | 3 |

---

## 8. Definición de terminado

- [x] Copia de seguridad antes de migrar.
- [x] Migración aplicada y verificada.
- [x] Cinco empleados nuevos, con un gerente y un encargado.
- [x] Login por código único.
- [x] `npm run verify` en verde.
- [x] Documento enlazado desde README y CHANGELOG.

### 8.1. Evidencia

```text
Copia creada: prisma\backups\dev-20261027-200648.db (86016 bytes)
Prisma migrate status → Database schema is up to date!
Empleado creado: código 3 · Lucía Ferrer · GERENTE
Empleado creado: código 4 · Marcos Peña · ENCARGADO
Empleado creado: código 5 · Ana Ruiz · CAMARERO
Empleado creado: código 6 · Diego Salas · CAMARERO
Empleado creado: código 7 · Nora Vidal · CAMARERO
```

Pruebas: **62/62 en verde**, con seis casos nuevos de códigos individuales.

---

## 9. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 1.5 | Campo `codigo`, migración, ocho empleados y login individual |
