# Contrato de API — Bloques 2.3 y 3.4–3.6

Qué promete la API de ALFRED, campo por campo, y cómo se comprueba que no cambia por accidente.

Escrito antes del código.

---

## 1. Qué es un contrato

El frontend y el backend son dos programas distintos. El **contrato** es la lista de promesas que el backend hace al frontend:

- qué ruta existe;
- qué método usa;
- quién puede llamarla;
- qué recibe;
- qué devuelve;
- qué errores puede dar.

Si el backend cambia un nombre de campo sin avisar, el frontend se rompe en silencio: lee `undefined`. Las pruebas de contrato convierten ese fallo silencioso en un test rojo.

---

## 2. Reglas comunes

| Regla | Valor |
|---|---|
| Formato | JSON en petición y respuesta |
| Codificación | UTF-8 |
| Dinero | Enteros en **céntimos** (`350` = 3,50 €) |
| Fechas | ISO 8601 en UTC (`2026-10-27T20:10:00.000Z`) |
| Autenticación | `Authorization: Bearer <token>` |
| Token | JWT HS256, sujeto = `id` de usuario, caducidad configurable |
| Cuerpo máximo | 100 KB |
| Campos desconocidos | Se ignoran (no se guardan) |
| Identificador de petición | Cabecera `X-Request-Id` (se genera si no viene) |

**Decisión C-1 — El contrato se escribe en Markdown, sin OpenAPI en este bloque.**
La superficie es pequeña (21 rutas) y el equipo es de dos personas. Un `openapi.yaml` duplicaría la información y se desincronizaría igual que este documento; lo que evita la deriva son las pruebas. OpenAPI entrará si aparece un cliente externo o se genera documentación interactiva (fase 11).

**Decisión C-2 — Las pruebas fijan el conjunto exacto de campos.**
No basta con comprobar que `id` existe: se compara la lista ordenada de claves. Así, añadir o quitar un campo obliga a actualizar el contrato y la prueba en el mismo commit.

**Decisión C-3 — `login` y `/me` devuelven la misma forma de usuario.**
Antes `login` omitía `activo` y `/me` lo incluía. Se unifica en `{ id, codigo, nombre, email, rol, activo }`. Nunca se devuelve `passwordHash`.

**Decisión C-4 — Los importes se documentan en céntimos.**
La API no devuelve cadenas como `"3,50 €"`; el formato es cosa del frontend (`web/src/lib/format.ts`). Un entero evita errores de redondeo y de coma decimal.

**Decisión C-5 — Las pruebas de contrato usan la API real y la base desechable.**
No se simulan controladores. Se arranca `app`, se hace una petición HTTP real contra SQLite temporal y se inspecciona el JSON. Es la única forma de probar el contrato completo: middlewares, serialización y errores.

---

## 3. Errores

Todas las respuestas de error tienen la misma base:

```json
{
  "code": "CODIGO_ESTABLE",
  "message": "Texto para la persona",
  "details": []
}
```

`details` solo aparece cuando hay información adicional (por ejemplo, validación campo a campo).

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | El cuerpo o la ruta no cumplen el esquema |
| 400 | `INVALID_JSON` | El cuerpo no es JSON válido |
| 401 | `UNAUTHORIZED` | Falta el token o el empleado está desactivado |
| 401 | `INVALID_TOKEN` | Token manipulado o caducado |
| 401 | `INVALID_CREDENTIALS` | Código de empleado inexistente o inactivo |
| 403 | `FORBIDDEN` | El rol no permite la acción |
| 404 | `NOT_FOUND` | Ruta, servicio, mesa, producto o línea inexistente |
| 409 | `CONFLICT` | Regla de negocio: mesa ocupada, servicio cerrado, línea ya anulada |
| 409 | `CODE_IN_USE` | Código de empleado duplicado |
| 409 | `EMAIL_IN_USE` | Email duplicado |
| 409 | `LAST_MANAGER` | Se intenta dejar el sistema sin gerente activo |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo de más de 100 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Codificación del cuerpo no soportada |
| 429 | `TOO_MANY_ATTEMPTS` | Cinco fallos de login desde la misma IP y código |
| 500 | `INTERNAL_ERROR` | Error no previsto; nunca filtra detalles internos |

Un `404` por ruta inexistente y un `404` por recurso inexistente comparten código; el `message` los distingue.

---

## 4. Superficie

Leyenda de permisos: **Público** · **Autenticado** (cualquier rol) · **Gerente** · **Encargado o gerente**.

| Método | Ruta | Permiso | Éxito | Respuesta |
|---|---|---|---|---|
| GET | `/health` | Público | 200 | `{ status: "ok" }` |
| GET | `/ready` | Público | 200 · 503 | `{ status, checks: { database } }` |
| POST | `/api/auth/login` | Público | 200 | `{ token, expiresIn, usuario }` |
| GET | `/api/auth/me` | Autenticado | 200 | `{ usuario }` |
| GET | `/api/sala` | Público | 200 | `{ mesas, productos, promos }` |
| POST | `/api/servicios` | Autenticado | 201 | `Servicio` |
| PATCH | `/api/servicios/:id/pax` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/merge` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/cancel` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/items` | Autenticado | 201 | `Servicio` |
| POST | `/api/servicios/:id/call` | Autenticado | 200 | `Servicio` |
| POST | `/api/lineas/:id/ready` | Autenticado | 200 | `Servicio` |
| POST | `/api/lineas/:id/anular` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/promo` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/split` | Autenticado | 200 | `Servicio` |
| POST | `/api/servicios/:id/pagar` | Encargado o gerente | 200 | `Servicio` |
| PATCH | `/api/mesas/layout` | Autenticado | 200 | `{ mesas, productos, promos }` |
| GET | `/api/usuarios` | Gerente | 200 | `{ usuarios }` |
| POST | `/api/usuarios` | Gerente | 201 | `{ usuario }` |
| PATCH | `/api/usuarios/:id` | Gerente | 200 | `{ usuario }` |
| PATCH | `/api/usuarios/:id/password` | Gerente | 204 | Sin cuerpo |
| GET | `/api/historico` | Encargado o gerente | 200 | `{ servicios, total, limit, offset }` |
| GET | `/api/historico/:id` | Encargado o gerente | 200 | `{ servicio }` |
| GET | `/api/caja` | Encargado o gerente | 200 | `{ sesion, resumen }` |
| POST | `/api/caja/abrir` | Encargado o gerente | 201 | `{ sesion }` |
| POST | `/api/caja/cerrar` | Encargado o gerente | 200 | `{ sesion, resumen }` |
| GET | `/api/caja/sesiones` | Encargado o gerente | 200 | `{ sesiones }` |

**Decisión C-6 — `GET /api/sala` es público.**
El salón se muestra antes de entrar y el login es un modal sobre la sala. Es una decisión de producto ya tomada (D-5); el contrato la refleja. El resto de rutas exige token.

**Decisión C-7 — Los empleados y sus contraseñas son solo de gerencia.**
`/api/usuarios` se monta con `requireAuth` + `requireRole("GERENTE")` a nivel de router. Un camarero recibe `403 FORBIDDEN`, no `404`: la ruta existe y el permiso es lo que falta (D-7).

**Decisión C-8 — Histórico y caja son de encargado y gerente.**
`/api/historico` y `/api/caja` se montan con `requireAuth` + `requireRole("ENCARGADO", "GERENTE")`. El camarero recibe `403 FORBIDDEN`. La comprobación se repite en el servidor aunque la UI oculte la sección (G-8).

---

## 5. Formas de datos

### 5.1. `Usuario`

```json
{
  "id": 5,
  "codigo": "5",
  "nombre": "Ana Ruiz",
  "email": "ana@alfred.local",
  "rol": "CAMARERO",
  "activo": true
}
```

`GET /api/usuarios` añade `createdAt`. Nunca se incluye `passwordHash`.

### 5.2. `Producto`

```json
{
  "id": 3,
  "nombre": "Pan de cristal",
  "precio": 350,
  "destino": "COCINA",
  "categoria": "ENTRANTE"
}
```

### 5.3. `Promo`

```json
{ "codigo": "ALFRED10", "tipo": "PORCENTAJE", "valor": 10 }
```

### 5.4. `Mesa`

```json
{
  "id": 1,
  "numeroMesa": 1,
  "capacidad": 4,
  "tipo": "MESA",
  "zona": "RESTAURANTE",
  "clase": "MESA",
  "layoutOrder": 0,
  "label": "1",
  "servicio": null
}
```

`servicio` es un `Servicio` completo o `null`.

### 5.5. `Linea`

```json
{
  "id": 10,
  "productoId": 3,
  "nombre": "Pan de cristal",
  "destino": "COCINA",
  "categoria": "ENTRANTE",
  "cantidad": 1,
  "numeroAsiento": 1,
  "esCompartido": false,
  "estado": "PENDIENTE",
  "motivoAnulacion": null,
  "precioUnitario": 350,
  "createdAt": "2026-10-27T20:10:00.000Z",
  "calledAt": null
}
```

Estados: `PENDIENTE`, `CALLED`, `READY`, `PAID`, `ANULADO`.

### 5.6. `Evento`

```json
{
  "id": 4,
  "tipo": "PEDIDO",
  "detalle": "1 × Pan de cristal",
  "createdAt": "2026-10-27T20:10:00.000Z",
  "actor": { "id": 5, "nombre": "Ana Ruiz" }
}
```

`actor` es `null` en eventos antiguos sin `actorId`.

### 5.7. `Servicio`

```json
{
  "id": 4,
  "estado": "ABIERTA",
  "pax": 2,
  "origen": "WALK_IN",
  "openedAt": "2026-10-27T20:10:00.000Z",
  "closedAt": null,
  "descuentoCodigo": null,
  "descuentoTipo": null,
  "descuentoValor": null,
  "splitModo": "NINGUNO",
  "metodoPago": null,
  "mesaIds": [1],
  "mesaLabels": ["1"],
  "lineas": [],
  "eventos": [],
  "pagos": [],
  "subtotal": 0,
  "discount": 0,
  "total": 0,
  "pagado": 0,
  "propinaTotal": 0,
  "saldo": 0
}
```

`subtotal`, `discount` y `total` son céntimos calculados en el servidor. El cliente no los envía ni los recalcula para cobrar.

`metodoPago` es `"EFECTIVO"`, `"TARJETA"` o `null` mientras el servicio está abierto.

### 5.8. `SesionCaja`

```json
{
  "id": 3,
  "estado": "CERRADA",
  "fondoInicial": 10000,
  "abiertaAt": "2026-11-01T19:00:00.000Z",
  "abiertaPor": { "id": 2, "nombre": "Responsable" },
  "cerradaAt": "2026-11-01T23:00:00.000Z",
  "cerradaPor": { "id": 2, "nombre": "Responsable" },
  "efectivoEsperado": 13500,
  "efectivoContado": 13000,
  "diferencia": -500,
  "notas": "Faltan 5 €"
}
```

`efectivoEsperado`, `efectivoContado`, `diferencia`, `cerradaAt`, `cerradaPor` y `notas` son `null` mientras la sesión está abierta. Todos los importes van en céntimos.

### 5.9. `ResumenCaja`

`solo lectura`: `ventasEfectivo`, `ventasTarjeta`, `totalCobrado`, `numeroCobros` y `efectivoEsperado`, todos calculados en el servidor. El esperado es `fondoInicial + ventasEfectivo` de los cobros cerrados dentro de la sesión.

---

## 6. Detalle por ruta

### POST `/api/auth/login`

Entrada:

```json
{ "codigo": "5" }
```

- `codigo`: obligatorio, 1–80 caracteres, se normaliza a minúsculas. Acepta el código de empleado o, como respaldo, el email.

Salida `200`:

```json
{
  "token": "eyJ...",
  "expiresIn": "8h",
  "usuario": { "id": 5, "codigo": "5", "nombre": "Ana Ruiz", "email": "ana@alfred.local", "rol": "CAMARERO", "activo": true }
}
```

Errores: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS`.

### GET `/api/auth/me`

Sin cuerpo. Salida `200`: `{ "usuario": Usuario }`. Errores: `401 UNAUTHORIZED`, `401 INVALID_TOKEN`.

### GET `/ready`

Sin cuerpo. Comprueba la base de datos con `SELECT 1`.

Salida `200`:

```json
{ "status": "ready", "checks": { "database": "ok" } }
```

Si la base no responde, salida `503`:

```json
{ "status": "unavailable", "checks": { "database": "error" } }
```

No incluye el error interno; ese detalle solo va al log. `/health` es liveness (el proceso vive) y no consulta la base.

### GET `/api/sala`

Sin cuerpo. Salida `200`:

```json
{ "mesas": [Mesa], "productos": [Producto], "promos": [Promo] }
```

Solo incluye productos y promociones activos, y servicios abiertos.

### POST `/api/servicios`

Abre un servicio (walk-in) o crea una mesa al vuelo.

```json
{ "mesaId": 1, "pax": 2 }
```

o

```json
{ "createTable": true, "zona": "TERRAZA", "clase": "MESA", "pax": 2 }
```

- `pax`: obligatorio, entero positivo.
- `mesaId` o `createTable: true`: al menos uno.
- `zona`: `RESTAURANTE`, `TERRAZA` o `BARRA`.
- `clase`: `MESA` o `PUNTO_BARRA`.

Salida `201`: `Servicio`. Errores: `400 VALIDATION_ERROR`, `404` mesa inexistente, `409` mesa ya ocupada.

### PATCH `/api/servicios/:id/pax`

```json
{ "pax": 4 }
```

Salida `200`: `Servicio`. Errores: `400`, `404`, `409` si el servicio no está abierto.

### POST `/api/servicios/:id/merge`

```json
{ "mesaIds": [2, 3] }
```

Une mesas al servicio. Salida `200`: `Servicio`. Errores: `404` si alguna mesa no existe, `409` si el servicio no está abierto.

### POST `/api/servicios/:id/cancel`

```json
{ "motivo": "El cliente se marchó" }
```

`motivo` opcional, máximo 500 caracteres. Salida `200`: `Servicio` cerrado. Errores: `404`, `409`.

### POST `/api/servicios/:id/items`

```json
{ "productoId": 3, "cantidad": 1, "numeroAsiento": 1, "esCompartido": false }
```

- `productoId`: obligatorio.
- `cantidad`: opcional, por defecto 1, máximo 100.
- `numeroAsiento`: entero positivo o `null`.
- `esCompartido`: opcional.

Salida `201`: `Servicio` con la línea nueva. Errores: `400`, `404` producto o servicio, `409` servicio cerrado.

### POST `/api/servicios/:id/call`

```json
{ "lineaIds": [10, 11] }
```

Envía a cocina/barra las líneas indicadas (o todas las pendientes si se omite). Salida `200`: `Servicio`. Errores: `404`, `409`.

### POST `/api/lineas/:id/ready`

Sin cuerpo. Marca la línea como `READY`. Salida `200`: `Servicio`. Errores: `404`, `409` si no estaba `CALLED`.

### POST `/api/lineas/:id/anular`

```json
{ "motivo": "Se cayó la bandeja" }
```

`motivo` obligatorio, 1–500 caracteres. Salida `200`: `Servicio`. Errores: `400`, `404`, `409` si ya estaba anulada.

### POST `/api/servicios/:id/promo`

```json
{ "codigo": "ALFRED10" }
```

Sin código, quita la promo. Salida `200`: `Servicio`. Errores: `404` código no válido, `409` servicio cerrado.

### POST `/api/servicios/:id/split`

```json
{ "splitModo": "IGUAL" }
```

Valores: `NINGUNO`, `IGUAL`, `ASIENTO`. Salida `200`: `Servicio`. Errores: `400`, `404`, `409`.

### POST `/api/servicios/:id/pagar`

```json
{
  "metodoPago": "EFECTIVO",
  "importe": 1200,
  "propina": 100,
  "efectivoEntregado": 2000,
  "concepto": "Asiento 1"
}
```

Cobro parcial, completo o por partes. `metodoPago` es opcional (`EFECTIVO` o `TARJETA`); sin él se asume `EFECTIVO`. `importe` y `propina` van en céntimos. Si se omite `importe`, se cobra el saldo. La propina no reduce el saldo. El servicio pasa a `PAGADA` solo cuando `saldo` llega a 0 (también una cuenta a 0).

También acepta `pagos[]` para un cobro mixto en la misma petición:

```json
{
  "pagos": [
    { "metodoPago": "EFECTIVO", "importe": 800, "propina": 50, "recibido": 1000, "concepto": "Asiento 1" },
    { "metodoPago": "TARJETA", "importe": 400, "concepto": "Asiento 2" }
  ]
}
```

La suma de `importe` no puede superar el saldo. **Solo `ENCARGADO` o `GERENTE`.** Salida `200`: `Servicio` con `pagos`, `pagado`, `propinaTotal` y `saldo`. Errores: `400` (efectivo insuficiente, importe por encima del saldo), `401`, `403 FORBIDDEN`, `404`, `409`.

`idempotencyKey` opcional evita duplicar un cobro reintentado.

### POST `/api/servicios/:id/devolver`

Solo `GERENTE`. Recibe `{ "importe": 500, "motivo": "Producto cancelado" }` en céntimos.
Registra una devolución parcial o total como pago negativo y como evento de auditoría. Errores: `400`, `401`, `403`, `404`, `409`.

### GET `/api/historico`

Parámetros de consulta: `desde`, `hasta` (ISO 8601), `estado` (`PAGADA` o `CANCELADA`), `limit` (1–100, por defecto 20) y `offset` (por defecto 0). Solo incluye servicios cerrados. Salida `200`:

```json
{ "servicios": [Servicio], "total": 12, "limit": 20, "offset": 0 }
```

Errores: `400`, `401`, `403 FORBIDDEN`.

### GET `/api/historico/:id`

Salida `200`: `{ "servicio": Servicio }`. Un servicio `ABIERTA` devuelve `404 NOT_FOUND`. Errores: `400`, `401`, `403`, `404`.

### GET `/api/caja`

Salida `200`:

```json
{
  "sesion": SesionCaja | null,
  "resumen": {
    "ventasEfectivo": 3500,
    "ventasTarjeta": 1200,
    "totalCobrado": 4700,
    "numeroCobros": 2,
    "efectivoEsperado": 13500
  }
}
```

Si no hay caja abierta, `sesion` es `null` y el resumen vale cero. Errores: `401`, `403`.

### POST `/api/caja/abrir`

```json
{ "fondoInicial": 10000 }
```

Salida `201`: `{ "sesion": SesionCaja }`. Solo puede existir una sesión abierta; la segunda devuelve `409 CAJA_ABIERTA`. Errores: `400`, `401`, `403`, `409`.

### POST `/api/caja/cerrar`

```json
{ "efectivoContado": 13000, "notas": "Faltan 5 €" }
```

Calcula y congela `efectivoEsperado`, guarda `efectivoContado`, `diferencia = contado - esperado`, actor y fecha. Salida `200`: `{ "sesion": SesionCaja, "resumen": ResumenCaja }`. Sin caja abierta devuelve `409 CAJA_NO_ABIERTA`. Errores: `400`, `401`, `403`, `409`.

### GET `/api/caja/sesiones`

Parámetro `limit` (1–50, por defecto 10). Salida `200`: `{ "sesiones": [SesionCaja] }`, solo cierres, del más reciente al más antiguo. Errores: `400`, `401`, `403`.

### PATCH `/api/mesas/layout`

```json
{ "items": [{ "id": 1, "layoutOrder": 0 }, { "id": 2, "layoutOrder": 1 }] }
```

Reordena las mesas. Salida `200`: `{ mesas, productos, promos }`. Errores: `400`, `404` si una mesa no existe.

### GET `/api/usuarios`

Salida `200`: `{ "usuarios": [Usuario + createdAt] }`, ordenados por activo y nombre. Errores: `401`, `403`.

### POST `/api/usuarios`

```json
{
  "codigo": "8",
  "nombre": "Nuevo Empleado",
  "email": "nuevo@alfred.local",
  "password": "ClaveSegura123",
  "rol": "CAMARERO"
}
```

- `codigo`: obligatorio, 1–20, letras/números/`-`/`_`, se normaliza a minúsculas.
- `nombre`: 2–100.
- `email`: válido, se normaliza a minúsculas.
- `password`: mínimo y máximo definidos en `src/auth/password.ts`.
- `rol`: `CAMARERO`, `ENCARGADO` o `GERENTE`.

Salida `201`: `{ usuario }`. Errores: `400`, `409 CODE_IN_USE`, `409 EMAIL_IN_USE`.

### PATCH `/api/usuarios/:id`

```json
{ "nombre": "Nombre corregido", "rol": "ENCARGADO", "activo": false }
```

Todos los campos son opcionales, pero debe venir al menos uno. Salida `200`: `{ usuario }`. Errores: `400`, `404`, `409 CODE_IN_USE`, `409 LAST_MANAGER`.

### PATCH `/api/usuarios/:id/password`

```json
{ "password": "NuevaClave123" }
```

Salida `204` sin cuerpo. Errores: `400`, `404`.

---

## 7. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | `/health` responde `200` con `{ status: "ok" }` | `tests/api-contract.test.ts` |
| CA-2 | Cualquier error usa `{ code, message }` y no filtra detalles internos | `tests/api-contract.test.ts` + `tests/errors.test.ts` |
| CA-3 | `GET /api/sala` es público y devuelve exactamente `mesas`, `productos`, `promos` con sus claves | `tests/api-contract.test.ts` |
| CA-4 | `login` y `/me` devuelven la misma forma de usuario, sin `passwordHash` | `tests/api-contract.test.ts` |
| CA-5 | `/api/usuarios` responde `401` sin token, `403` a un camarero y `200` a un gerente | `tests/api-contract.test.ts` + `tests/authz.test.ts` |
| CA-6 | Un servicio recién abierto devuelve todas las claves del contrato y totales en céntimos | `tests/api-contract.test.ts` |
| CA-7 | `POST /pagar` da `403` a un camarero y `200` a un gerente | `tests/api-contract.test.ts` + `tests/authz.test.ts` |
| CA-8 | Una ruta inexistente devuelve `404 NOT_FOUND` | `tests/api-contract.test.ts` |
| CA-9 | `/api/historico` y `/api/caja` devuelven `403` a un camarero y la forma documentada a un encargado | `tests/gerencia.test.ts` + `tests/api-contract.test.ts` |
| CA-10 | El cobro guarda `metodoPago` y el arqueo calcula el esperado solo con efectivo | `tests/gerencia.test.ts` |
| CA-11 | Una segunda apertura de caja devuelve `409 CAJA_ABIERTA` y el cierre guarda la diferencia | `tests/gerencia.test.ts` |

---

## 8. Definición de terminado

- [x] Documento con las 27 rutas, permisos, entrada, salida y errores.
- [x] `login` y `/me` comparten forma de usuario.
- [x] Pruebas de contrato sobre la API real con base desechable.
- [x] El conjunto exacto de claves está fijado en las pruebas.
- [x] `npm run verify` en verde.
- [x] README, CHANGELOG y plan actualizados.

### 8.1. Evidencia

- `docs/API.md`: 27 rutas, reglas comunes, 15 códigos de error y formas de datos.
- `tests/api-contract.test.ts`: **12 pruebas** que fijan el conjunto exacto de claves de `Usuario`, `Mesa`, `Producto`, `Servicio`, `Linea` y `Evento`.
- `POST /api/auth/login` incluye `activo`, igual que `/api/auth/me`; ninguna respuesta incluye `passwordHash`.
- Permisos comprobados: `/api/usuarios` da `401` sin token, `403` a camarero y `200` a gerente; `/pagar` da `403` a camarero y `200` a gerente.
- La suite completa queda en **90/90 pruebas**.
- La ejecución de archivos de prueba pasa a ser secuencial (`--test-concurrency=1`) para eliminar una carrera al crear mesas; verificado con tres ejecuciones consecutivas en verde.

**Lecciones:**

- Documentar `PAGADA` en vez de `PAGADO` parece un detalle, pero el test lo detectó: el estado real es femenino porque concuerda con «cuenta».
- Las pruebas que fijan claves ordenadas obligan a decidir si un campo nuevo es parte del contrato o un detalle interno.
- Ejecutar pruebas directamente con `tsx` usa `.env` y escribe en `dev.db`; siempre hay que usar `npm test`.

---

## 9. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 2.3 | Especificación del contrato, errores comunes y 20 rutas |
| 2026-10-27 | 2.3 | 12 pruebas de contrato, usuario unificado y suite secuencial |
| 2026-10-27 | 2.4 | Añadida `GET /ready`; el contrato pasa a 21 rutas |
