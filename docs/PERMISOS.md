# Permisos y protección de escrituras — Bloque 1.3

Especificación de quién puede hacer qué en la API de ALFRED.

Escrita antes del código. Las pruebas se derivan de los criterios de aceptación.

---

## 1. Problema

Hoy solo dos zonas exigen identidad:

- `POST /api/servicios/:id/pagar` (encargado o gerente).
- Todo `/api/usuarios` (gerente).

El resto de escrituras está abierto: cualquiera que alcance el puerto 3000 puede abrir mesas, añadir líneas, anular consumiciones, cancelar servicios o mover el plano del salón **sin identificarse**.

No es un problema teórico: en una red local compartida, cualquier dispositivo puede llamar a la API.

---

## 2. Principio

1. **Leer no es lo mismo que escribir.** Una escritura cambia el estado del restaurante y debe saber quién la hace.
2. **Denegar por defecto.** Si una ruta nueva no declara permisos, no debería nacer abierta.
3. **La autorización va antes que la validación.** Sin identidad no se evalúa el cuerpo: primero `401`, luego `400`.
4. **El frontend no es seguridad.** Ocultar un botón mejora la experiencia, no protege nada.

---

## 3. Matriz de permisos

Roles: `CAMARERO` (código 2), `ENCARGADO` (1), `GERENTE` (0).

| Método y ruta | Sin token | CAMARERO | ENCARGADO | GERENTE |
|---|---|---|---|---|
| `POST /api/auth/login` | público | — | — | — |
| `GET /api/auth/me` | 401 | ✅ | ✅ | ✅ |
| `GET /api/sala` | público¹ | ✅ | ✅ | ✅ |
| `POST /api/servicios` | 401 | ✅ | ✅ | ✅ |
| `PATCH /api/servicios/:id/pax` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/merge` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/cancel` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/items` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/call` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/promo` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/split` | 401 | ✅ | ✅ | ✅ |
| `POST /api/servicios/:id/pagar` | 401 | 403 | ✅ | ✅ |
| `POST /api/lineas/:id/ready` | 401 | ✅ | ✅ | ✅ |
| `POST /api/lineas/:id/anular` | 401 | ✅ | ✅ | ✅ |
| `PATCH /api/mesas/layout` | 401 | ✅ | ✅ | ✅ |
| `GET/POST/PATCH /api/usuarios/**` | 401 | 403 | 403 | ✅ |
| `GET /api/historico`, `/api/historico/:id` | 401 | 403 | ✅ | ✅ |
| `GET /api/caja`, `/api/caja/sesiones` | 401 | 403 | ✅ | ✅ |
| `POST /api/caja/abrir`, `/api/caja/cerrar` | 401 | 403 | ✅ | ✅ |

¹ Ver decisión D-5.

---

## 4. Decisiones

**D-5 — Las lecturas siguen abiertas en este bloque.** `GET /api/sala` no exige token porque la aplicación carga el salón antes de que nadie inicie sesión, y el login solo es obligatorio para cobrar. Cerrarlo ahora rompería el uso actual. Queda registrado como deuda: cuando el login sea obligatorio para toda la app (Fase 4), `GET /api/sala` también se protege.

**D-6 — Anular una línea lo puede hacer cualquier rol autenticado.** Hoy el camarero ve el botón de anular y no existe flujo de aprobación. Restringirlo a encargado rompería la operación sin avisar. La aprobación de anulaciones (y su trazabilidad económica) entra en la Fase 4, junto con el cobro.

**D-7 — `401` frente a `403`.** `401` significa "no sé quién eres" (falta token, token inválido, usuario inactivo). `403` significa "sé quién eres y no puedes". El cliente puede reaccionar distinto: con `401` pide login; con `403` muestra un aviso.

**D-8 — Un middleware por ruta, explícito.** Se escribe `requireAuth` en cada ruta de escritura en lugar de un `router.use` global. Es más repetitivo, pero al leer el archivo se ve qué está protegido y qué no. Una ruta nueva sin protección se detecta a simple vista.

**D-9 — El rol se comprueba además del token.** Un token válido prueba identidad, no autorización. El rol se lee de la base de datos en cada petición (`requireAuth` consulta el usuario), así que desactivar a un empleado surte efecto sin esperar a que caduque su token.

---

## 5. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | Toda ruta de escritura devuelve `401 UNAUTHORIZED` sin token | `tests/authz.test.ts` |
| CA-2 | Un token manipulado devuelve `401 INVALID_TOKEN` | `tests/authz.test.ts` |
| CA-3 | Un camarero recibe `403 FORBIDDEN` al intentar cobrar | `tests/authz.test.ts` |
| CA-4 | Un camarero recibe `403 FORBIDDEN` al intentar gestionar usuarios | `tests/authz.test.ts` |
| CA-5 | Un camarero autenticado **alcanza** la lógica de negocio (recibe `409` en mesa ocupada, no `401`) | `tests/authz.test.ts` |
| CA-6 | `POST /api/auth/login` sigue siendo público | `tests/authz.test.ts` |
| CA-7 | `GET /api/sala` sigue siendo público (decisión D-5) | `tests/authz.test.ts` |
| CA-8 | Sin token, una petición con cuerpo inválido devuelve `401`, no `400` | `tests/authz.test.ts` |
| CA-9 | Las pruebas existentes de validación siguen pasando, ahora autenticadas | `tests/api.test.ts` |

---

## 6. Alcance

### Entra

- `requireAuth` en las 11 rutas de escritura del salón.
- Pruebas de `401`, `403`, token manipulado y orden de middleware.
- Autenticación en las pruebas existentes de validación.

### No entra

| Tema | Fase |
|---|---|
| Proteger lecturas y hacer el login obligatorio | 4 |
| Aprobación de anulaciones y trazabilidad económica | 4 |
| Auditoría del actor en todos los eventos | 1.4 |
| Códigos individuales por camarero (hoy el código 2 es compartido) | 4 |

---

## 7. Definición de terminado

- [x] Especificación y matriz antes del código.
- [x] Pruebas escritas y vistas fallar (hoy devuelven `404`/`200` en vez de `401`).
- [x] Middleware aplicado en todas las escrituras.
- [x] `npm run verify` en verde.
- [x] Documento enlazado desde README y CHANGELOG.

### 7.1. Evidencia

Antes del cambio, las 12 rutas de escritura respondían `404` o `200` sin token:

```text
✖ rechaza reordenar mesas sin token    200 !== 401
✖ rechaza un token manipulado          404 !== 401
✖ devuelve 401 antes de validar        400 !== 401
```

Después: **52 pruebas, 52 en verde**.

Cambio adicional obligado en el frontend: como ahora no se puede escribir sin sesión, el login deja de ser opcional. La aplicación muestra el acceso al arrancar y, si el token caduca, limpia la sesión y vuelve a pedirlo. `GET /api/sala` sigue siendo público según D-5.

---

## 8. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 1.3 | Matriz de permisos y criterios iniciales |
| 2026-10-27 | 1.3 | `requireAuth` en las 12 rutas de escritura, login obligatorio en el frontend y 19 pruebas nuevas |

