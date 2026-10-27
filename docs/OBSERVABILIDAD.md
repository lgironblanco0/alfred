# Observabilidad — Bloque 2.4

Cómo saber qué está pasando en ALFRED cuando algo va mal, sin filtrar datos de empleados ni de clientes.

Escrito antes del código.

---

## 1. Punto de partida

La base ya existe, pero no está cerrada:

| Pieza | Antes de 2.4 |
|---|---|
| Logs | JSON con `level`, `message`, `time` y campos |
| Identificador de petición | `X-Request-Id` generado o respetado; viaja en cada log de petición |
| Log de acceso | Método, ruta, estado y duración |
| `GET /health` | Responde `200 { status: "ok" }` siempre |
| Readiness | No existe |
| Errores | El mensaje interno se oculta al cliente, pero el log no incluye pila |
| Datos sensibles | No se registran cuerpos, pero nada impide que un futuro `log(..., { token })` los filtre |

---

## 2. Modelo mental

**Un log no es un adorno: es la caja negra del servidor.**

```text
Petición entra
  └─ requestId (uuid o el que traiga el cliente)
       ├─ cada log de esa petición lleva el mismo requestId
       ├─ al terminar: level, method, path, status, durationMs, userId
       └─ si falla: errorHandler registra el mismo requestId y la pila

Monitor / orquestador
  ├─ GET /health  → ¿el proceso vive?      (liveness)
  └─ GET /ready   → ¿puede atender?        (readiness: base de datos)
```

La diferencia importa:

- **Liveness** (`/health`) responde mientras el proceso exista. Si falla, el orquestador reinicia el contenedor.
- **Readiness** (`/ready`) comprueba dependencias. Si la base no responde, el orquestador deja de enviar tráfico, pero **no** reinicia: el proceso está sano, la dependencia no.

**Decisión O-1 — `/health` no toca la base.**
Debe ser barato y no caer por una dependencia. Su única promesa es «el proceso está vivo».

**Decisión O-2 — `/ready` ejecuta `SELECT 1` y devuelve `503` si falla.**
Es la comprobación real de que la API puede servir datos. No devuelve el error interno, solo `database: "error"`; el detalle queda en el log.

**Decisión O-3 — Los logs son JSON en una línea, siempre.**
Es el formato que entienden Loki, CloudWatch, Datadog y `jq`. En desarrollo se leen igual de bien y no hay dos formatos que mantener. `LOG_LEVEL=silent` los apaga en pruebas.

**Decisión O-4 — El log de acceso identifica al empleado, no a la persona.**
Se añade `userId` y `role` cuando la petición está autenticada. Nunca el nombre, el email ni el código. Para investigar un cobro basta con cruzar `userId` con la auditoría de la base.

**Decisión O-5 — El logger redacta claves sensibles.**
Antes de escribir, recorre los campos y sustituye por `[REDACTED]` cualquier clave que contenga `password`, `token`, `authorization`, `secret`, `cookie` o `jwt`. No sustituye la disciplina: sigue estando prohibido registrar cuerpos completos. Es una red de seguridad para el error humano.

**Decisión O-6 — La pila solo se registra fuera de producción.**
En producción, un stack puede revelar rutas internas o detalles de SQL. El log de producción guarda `name` y `message`; en desarrollo y pruebas se añade `stack` para depurar.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | Cada log es una línea JSON con `level`, `message` y `time` | `tests/observability.test.ts` |
| CA-2 | `sanitizeLogFields` redacta claves sensibles en cualquier profundidad | `tests/observability.test.ts` |
| CA-3 | El log de acceso incluye `requestId`, método, ruta, estado y duración | `tests/observability.test.ts` |
| CA-4 | El log de acceso añade `userId` y `role` si hay usuario autenticado | `tests/observability.test.ts` |
| CA-5 | `/health` responde `200 { status: "ok" }` sin consultar la base | `tests/observability.test.ts` + `tests/api.test.ts` |
| CA-6 | `/ready` responde `200` con `database: "ok"` cuando la base responde | `tests/observability.test.ts` |
| CA-7 | `/ready` responde `503` con `database: "error"` cuando la base falla | `tests/observability.test.ts` |
| CA-8 | El cliente nunca recibe la pila ni el mensaje interno | `tests/errors.test.ts` (ya existente) |
| CA-9 | Un `500` registra `requestId` y, fuera de producción, `stack` | Revisión + prueba unitaria del manejador |

---

## 4. Alcance

### Entra

- Redacción de campos sensibles en `logger.ts`.
- Campos de usuario en el log de acceso.
- `GET /ready` con comprobación de base inyectable.
- Pila en el log de errores fuera de producción.
- Documento, pruebas y actualización de README/CHANGELOG/plan.

### No entra

| Tema | Fase |
|---|---|
| Métricas Prometheus / OpenTelemetry | 11 |
| Trazas distribuidas | 11 |
| Alertas y paneles | 11 |
| Rotación y retención de logs | 11 (lo gestiona la plataforma) |
| Logs de auditoría de negocio | Ya existen en la tabla `EventoServicio` (1.4) |

---

## 5. Definición de terminado

- [x] Especificación escrita.
- [x] Redacción de campos sensibles probada.
- [x] Log de acceso con usuario autenticado.
- [x] `/ready` con base sana y con base caída.
- [x] Pila en errores solo fuera de producción.
- [x] `npm run verify` en verde.
- [x] README, CHANGELOG y plan actualizados.

### 5.1. Evidencia

- `src/logger.ts`: `sanitizeLogFields` redacta `password`, `token`, `authorization`, `secret`, `cookie` y `jwt` en cualquier profundidad, trunca cadenas de más de 1000 caracteres y limita la profundidad a 4.
- `src/middleware/requestLogger.ts`: `requestLogFields` añade `userId` y `role` cuando hay usuario; nunca nombre ni email.
- `src/health.ts`: `getReadiness(check)` inyectable; `SELECT 1` real en producción.
- `GET /ready`: `200 { status: "ready", checks: { database: "ok" } }` o `503 { status: "unavailable", checks: { database: "error" } }`.
- `src/middleware/errorHandler.ts`: `errorLogFields` añade `errorName` y `stack` solo fuera de producción.
- `tests/observability.test.ts`: **9 pruebas** (redacción, truncado, log de acceso, readiness sano y caído, ruta real y campos de error).
- Suite completa: **99/99 pruebas**.

**Verificación manual sugerida:**

```powershell
$env:LOG_LEVEL = "debug"
npm run dev
# En otra terminal:
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/ready
```

Los logs deben ser una línea JSON con `time`, `level`, `message` y `requestId`.

---

## 6. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 2.4 | Especificación de logs, redacción, health y readiness |
| 2026-10-27 | 2.4 | Redacción, usuario en el log, `/ready` y pila solo en desarrollo |
