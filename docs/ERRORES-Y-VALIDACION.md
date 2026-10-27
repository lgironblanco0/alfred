# Validación y errores canónicos — Bloque 1.2

Especificación del contrato de entrada y del formato de error de la API de ALFRED.

Este documento se escribe **antes** del código. Las pruebas se derivan de los criterios de aceptación (CA).

---

## 1. Problema

Hoy la API responde errores con forma parecida, pero sin contrato escrito:

- Algunos errores llevan `details` y otros no.
- Los códigos `code` mezclan valores genéricos (`NOT_FOUND`) con otros de dominio (`INVALID_CREDENTIALS`).
- Zod usa `z.coerce.number()` también en el **cuerpo** JSON, así que `pax: true` se convierte en `1` y se acepta.
- Un cuerpo sin `mesaId` ni `createTable` se detecta en el servicio y devuelve `BAD_REQUEST`, no `VALIDATION_ERROR`.
- No hay pruebas que fijen el formato: cualquier cambio futuro puede romperlo sin que nadie lo note.

Sin contrato, el frontend no puede distinguir errores y las pruebas no protegen nada.

---

## 2. Formato canónico de error

Toda respuesta de error de la API es un JSON con esta forma:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Datos de entrada no válidos",
  "details": [{ "path": "pax", "message": "expected number, received string" }]
}
```

| Campo | Obligatorio | Tipo | Regla |
|---|---|---|---|
| `code` | Sí | string | `^[A-Z][A-Z0-9_]*$`, estable, para programas |
| `message` | Sí | string | En español, legible, sin datos internos |
| `details` | No | objeto o array | Solo cuando aporta información accionable |

Reglas adicionales:

1. Nunca se incluye `stack`, `sql`, rutas del servidor ni el mensaje crudo de una excepción.
2. El `X-Request-Id` de la respuesta es el nexo con el log del servidor.
3. `details` **no aparece** si no hay información que añadir; no se envía `null`.
4. El código HTTP y `code` son independientes: `code` da el detalle, el status da la categoría.

---

## 3. Catálogo de errores

### 3.1. Errores de borde (los produce la infraestructura o `parseInput`)

| Status | `code` | Cuándo |
|---|---|---|
| 400 | `INVALID_JSON` | El cuerpo no es JSON válido |
| 400 | `VALIDATION_ERROR` | Zod rechaza la forma o los valores |
| 413 | `PAYLOAD_TOO_LARGE` | Cuerpo mayor de 100 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Charset o codificación no soportada |
| 404 | `NOT_FOUND` | La URL no corresponde a ninguna ruta |

### 3.2. Errores de identidad (middleware)

| Status | `code` | Cuándo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Falta el token o el usuario no existe o está inactivo |
| 401 | `INVALID_TOKEN` | El token no se puede verificar |
| 401 | `INVALID_CREDENTIALS` | Código de empleado inexistente en el login |
| 403 | `FORBIDDEN` | Autenticado, pero sin el rol requerido |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiados intentos de login |

### 3.3. Errores de negocio (servicio)

| Status | `code` por defecto | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | Falta un dato que el servicio necesita y el borde no pudo exigir |
| 404 | `NOT_FOUND` | Mesa, servicio, línea, producto o promo inexistente |
| 409 | `CONFLICT` | La operación choca con el estado actual (mesa ocupada, servicio cerrado, línea ya anulada) |
| 409 | `EMAIL_IN_USE` | Alta de usuario con email repetido |

**Decisión D-1:** no se inventa un código de dominio por cada error. Se añade un `code` propio solo cuando el cliente necesita **distinguir** dos errores con el mismo status. El `message` cubre el detalle humano.

---

## 4. Dónde se valida cada cosa

| Tipo de dato | Herramienta | Motivo |
|---|---|---|
| Parámetros de ruta (`/servicios/:id`) | `z.coerce.number()` | Express los entrega como texto |
| Cuerpo JSON | `z.number()` **sin coerción** | JSON ya distingue número de texto |
| Enums, booleanos, strings | Zod estricto | Evitar conversiones silenciosas |
| Reglas de negocio (mesa libre, asiento en rango) | Servicio | Dependen del estado de la base de datos |

**Decisión D-2:** el cuerpo no se coacciona. `pax: "2"`, `pax: true` y `pax: null` devuelven `400`, porque un cliente que envía un tipo equivocado tiene un error, y aceptarlo en silencio esconde el fallo. La coerción queda solo donde el protocolo obliga: params y query.

**Decisión D-3:** los campos desconocidos del cuerpo **se ignoran** (comportamiento por defecto de Zod). Se documenta en vez de usar `.strict()` para no romper clientes antiguos que envíen campos extra. Riesgo asumido: un error tipográfico (`paxx`) se detecta porque falta el campo requerido, no porque sobre.

**Decisión D-4:** `POST /api/servicios` exige `mesaId` o `createTable` en el borde, con `VALIDATION_ERROR` y `path: "mesaId"`. El servicio mantiene su comprobación como defensa en profundidad.

---

## 5. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | Todo error tiene `code` y `message`; `code` cumple `^[A-Z][A-Z0-9_]*$` | `tests/errors.test.ts`, `tests/api.test.ts` |
| CA-2 | `details` solo aparece cuando hay información y nunca es `null` | `tests/errors.test.ts` |
| CA-3 | Un archivo JSON roto devuelve `400 INVALID_JSON` | `tests/api.test.ts` |
| CA-4 | Un cuerpo de más de 100 KB devuelve `413 PAYLOAD_TOO_LARGE` | `tests/api.test.ts` |
| CA-5 | Un charset no soportado devuelve `415 UNSUPPORTED_MEDIA_TYPE` | `tests/api.test.ts` |
| CA-6 | Una URL inexistente devuelve `404 NOT_FOUND` | `tests/api.test.ts` |
| CA-7 | `pax` como texto devuelve `400 VALIDATION_ERROR` con `path: "pax"` | `tests/api.test.ts` |
| CA-8 | `pax` booleano devuelve `400` (no se convierte en `1`) | `tests/api.test.ts` |
| CA-9 | Un cuerpo que no es objeto devuelve `400` con `path: "body"` | `tests/api.test.ts` |
| CA-10 | Un walk-in sin `mesaId` ni `createTable` devuelve `400 VALIDATION_ERROR` con `path: "mesaId"` | `tests/api.test.ts` |
| CA-11 | Un identificador de recurso inexistente devuelve `404 NOT_FOUND` | `tests/api.test.ts` |
| CA-12 | Un error inesperado devuelve `500 INTERNAL_ERROR` sin filtrar el mensaje interno | `tests/errors.test.ts` |
| CA-13 | Si la respuesta ya empezó a enviarse, el manejador delega en `next` | `tests/errors.test.ts` |

---

## 6. Alcance

### Entra

- Contrato de error escrito y probado.
- Validación del cuerpo sin coerción.
- `POST /api/servicios` valida mesa en el borde.
- Pruebas unitarias del manejador de errores.
- Pruebas de contrato de los códigos de borde.

### No entra (se registra para su fase)

| Tema | Fase |
|---|---|
| Matriz de permisos por rol (401/403 en todas las escrituras) | 1.3 |
| Auditoría del actor en los eventos | 1.4 |
| `409` con prueba determinista (necesita base temporal) | 2.1 |
| Validación de asiento dentro del rango de `pax` | 2.2 |
| 405 para método no permitido | 2.3 |

**Nota sobre el 409:** hoy se puede probar contra la base de demostración, pero depende de que exista una mesa ocupada. La prueba queda condicionada y se volverá determinista en 2.1, cuando cada ejecución tenga su propia base.

---

## 7. Definición de terminado

- [x] Especificación escrita antes del código.
- [x] Pruebas de CA-1 a CA-13 escritas y vistas fallar donde deben.
- [x] Implementación aplicada.
- [x] `npm run verify` en verde.
- [x] Documento enlazado desde README y CHANGELOG.

### 7.1. Evidencia de la verificación

1. Se escribieron las pruebas antes del cambio. Resultado inicial:

```text
✖ rechaza pax enviado como texto          actual: 404, expected: 400
✖ no convierte un booleano en un pax      actual: 404, expected: 400
✖ exige mesa o creación de mesa           actual: BAD_REQUEST, expected: VALIDATION_ERROR
```

2. Se retiró `z.coerce.number()` de los cuerpos y se añadió la comprobación de mesa en el borde.
3. Resultado final: **33 pruebas, 33 en verde**, incluidas las 10 nuevas del manejador de errores.

La prueba de `409` se ejecutó contra una mesa ocupada de la base de demostración. Queda condicionada: si no hay mesas ocupadas, se marca como omitida con un mensaje explícito. En 2.1 pasará a ser determinista.

---

## 8. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 1.2 | Contrato inicial: formato, catálogo, reglas de validación y criterios |
| 2026-10-27 | 1.2 | Implementado: cuerpos sin coerción, mesa exigida en el borde, 23 pruebas de contrato y 10 unitarias del manejador |

