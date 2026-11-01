# Gerencia — Fase 3

Documento escrito antes de implementar. Define el alcance de la fase, las decisiones y los criterios que deben demostrarse.

---

## 1. Objetivo

El rol `GERENTE` puede administrar el restaurante; el rol `ENCARGADO` puede consultar el histórico y operar el arqueo de caja. El camarero no accede a Gerencia.

La carta actual se considera **aceptada como carta de prueba**: no se rediseña ni se añaden productos en esta fase. Las pantallas de carta de los Bloques 3.2 y 3.3 quedan cerradas por decisión de producto.

---

## 2. Alcance

### 2.1. Empleados

- Listar empleados con código, nombre, email, rol y estado.
- Crear empleados con código único, nombre, email, contraseña y rol (`GERENTE`, `ENCARGADO` o `CAMARERO`).
- Cambiar nombre, código, rol y estado activo/inactivo.
- Restablecer contraseña.
- Impedir que el sistema se quede sin ningún gerente activo.
- No se borran empleados: se desactivan, para no romper el histórico ni la auditoría.

**Permiso:** solo `GERENTE`.

### 2.2. Histórico de cuentas

- Listar servicios cerrados (`PAGADA` o `CANCELADA`) con filtros por fecha y estado.
- Ver el detalle: mesas, pax, líneas, importes, descuento, método de pago y eventos con actor.
- Paginación con límite máximo.

**Permiso:** `GERENTE` y `ENCARGADO`. El camarero recibe `403`.

### 2.3. Arqueo de caja

- Abrir una sesión de caja con un fondo inicial en efectivo.
- Solo puede haber una sesión abierta a la vez.
- Al cerrar, calcular el efectivo esperado y compararlo con el contado.
- Guardar una foto de los importes en el momento del cierre.
- Consultar la sesión actual y el historial de cierres.

**Permiso:** `GERENTE` y `ENCARGADO`, también para consultar. El camarero recibe `403`.

---

## 3. Decisiones

### G-1 — La carta no se toca

Los Bloques 3.2 y 3.3 se cierran sin cambios: la carta de prueba actual cubre las necesidades del MVP. Cualquier cambio de carta se tratará como una petición nueva.

### G-2 — Empleados: desactivar, nunca borrar

`Usuario` ya tiene `activo`. Desactivar conserva la trazabilidad de eventos y evita romper relaciones. El login y `requireAuth` ya rechazan usuarios inactivos.

La creación exige contraseña porque el login actual la verifica aunque la entrada sea por código. La contraseña se guarda con `bcrypt`; nunca se devuelve.

### G-3 — Histórico de solo lectura

El histórico no modifica servicios. Solo lista y detalla. Se excluyen los servicios `ABIERTA` porque ya están visibles en Sala y no son histórico.

Los filtros de fecha se aplican sobre `closedAt`, que es la fecha real de cierre. `desde` incluye el instante indicado; `hasta` también. La UI envía fechas ISO completas para evitar ambigüedad de zona horaria.

### G-4 — Método de pago mínimo ahora

El cobro actual solo marca `PAGADA`. Para que el arqueo sea honesto, un cobro debe saber si fue en efectivo o con tarjeta. Se añade a `Servicio` un campo `metodoPago` (`EFECTIVO` o `TARJETA`).

- Si el cuerpo de `POST /api/servicios/:id/pagar` no indica método, se asume `EFECTIVO` para no romper clientes ni pruebas existentes.
- El frontend pregunta el método antes de confirmar.
- Los pagos mixtos, parciales, propina y devoluciones quedan para la Fase 4. No se finge que existen.

### G-5 — Sesión de caja con foto al cerrar

Modelo `SesionCaja`:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | entero | Identidad |
| `estado` | `ABIERTA` / `CERRADA` | Una sola abierta |
| `fondoInicial` | céntimos | Efectivo con el que se abre |
| `abiertaAt` / `abiertaPorId` | fecha / usuario | Quién abre y cuándo |
| `cerradaAt` / `cerradaPorId` | fecha / usuario | Quién cierra y cuándo |
| `efectivoEsperado` | céntimos | Foto al cerrar |
| `efectivoContado` | céntimos | Lo contado físicamente |
| `diferencia` | céntimos | `contado - esperado` |
| `notas` | texto opcional | Explicación de la diferencia |

El efectivo esperado se calcula así:

```text
efectivo esperado = fondo inicial
                  + suma de totales de servicios PAGADA con metodoPago EFECTIVO
                    cuyo closedAt cae dentro de la sesión
```

La sesión abierta muestra el esperado en vivo; al cerrar se congela. `diferencia > 0` es sobrante; `diferencia < 0` es faltante.

### G-6 — Dinero en céntimos

Todos los importes son enteros en céntimos, como el resto del proyecto. No se usan decimales flotantes para dinero.

### G-7 — El arqueo no bloquea el cobro

Se puede cobrar sin una caja abierta. El arqueo mide; no es un requisito operativo para cobrar. Si se quisiera bloquear, sería una decisión de producto distinta y se añadiría con su propia prueba.

### G-8 — El servidor manda

Ocultar el botón de Gerencia a un camarero es comodidad, no seguridad. Todas las rutas nuevas vuelven a comprobar el rol en el backend y tienen una prueba negativa.

---

## 4. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| GA-01 | El gerente puede crear un empleado con código único, rol y contraseña; la respuesta no incluye el hash | `tests/gerencia.test.ts` |
| GA-02 | Un encargado y un camarero reciben `403` al intentar listar o crear empleados | `tests/gerencia.test.ts` |
| GA-03 | No se puede desactivar ni degradar al último gerente activo (`409 LAST_MANAGER`) | `tests/gerencia.test.ts` |
| GA-04 | El histórico lista solo servicios cerrados y admite filtros de fecha y estado | `tests/gerencia.test.ts` |
| GA-05 | El detalle del histórico incluye líneas, eventos, total y método de pago | `tests/gerencia.test.ts` |
| GA-06 | Un camarero recibe `403` en histórico y en arqueo | `tests/gerencia.test.ts` |
| GA-07 | Al cobrar se guarda `EFECTIVO` o `TARJETA`; sin método se asume `EFECTIVO` | `tests/gerencia.test.ts` |
| GA-08 | Solo puede existir una sesión de caja abierta; la segunda devuelve `409` | `tests/gerencia.test.ts` |
| GA-09 | El efectivo esperado suma el fondo y solo los cobros en efectivo de la sesión | `tests/gerencia.test.ts` |
| GA-10 | Al cerrar se guardan esperado, contado, diferencia y actor, y la sesión deja de estar abierta | `tests/gerencia.test.ts` |
| GA-11 | La UI muestra Gerencia solo a gerente y encargado, y Empleados solo al gerente | `e2e/gerencia.spec.ts` |
| GA-12 | El flujo completo de cobro con método y cierre de caja funciona en el navegador | `e2e/gerencia.spec.ts` |

---

## 5. Contrato de API

### 5.1. Empleados (sin cambios de forma)

- `GET /api/usuarios` → `{ usuarios: [...] }`
- `POST /api/usuarios` → `201 { usuario }`
- `PATCH /api/usuarios/:id` → `{ usuario }`
- `PATCH /api/usuarios/:id/password` → `204`

### 5.2. Histórico (nuevo)

- `GET /api/historico?desde=&hasta=&estado=&limit=&offset=` → `{ servicios, total, limit, offset }`
- `GET /api/historico/:id` → `{ servicio }`

### 5.3. Caja (nuevo)

- `GET /api/caja` → `{ sesion: SesionCaja | null, resumen: ResumenCaja }`
- `POST /api/caja/abrir` con `{ fondoInicial }` → `201 { sesion }`
- `POST /api/caja/cerrar` con `{ efectivoContado, notas? }` → `{ sesion }`
- `GET /api/caja/sesiones?limit=` → `{ sesiones }`

`ResumenCaja` incluye `ventasEfectivo`, `ventasTarjeta`, `totalCobrado`, `numeroCobros` y `efectivoEsperado`.

### 5.4. Cobro

- `POST /api/servicios/:id/pagar` con `{ metodoPago?: "EFECTIVO" | "TARJETA" }`.

---

## 6. Plan de pruebas

1. **Integración**: permisos, histórico, arqueo y método de pago contra la API real y base temporal.
2. **Contrato**: las claves de `Servicio` incluyen `metodoPago`; las respuestas nuevas tienen forma fija.
3. **E2E**: gerente crea un empleado, consulta histórico y cierra caja; encargado ve arqueo pero no empleados; camarero no ve Gerencia.
4. **Manual**: revisar la pantalla a `390` y `768` px y con teclado.

---

## 7. Definition of Done

- [x] Especificación y criterios escritos antes del código.
- [x] Pruebas de integración y contrato escritas antes de la implementación.
- [x] Migración aplicada con copia previa de `dev.db`.
- [x] Empleados ficticios añadidos al seed con rol explícito.
- [x] Histórico y arqueo con permisos de servidor.
- [x] UI usable con teclado y en móvil.
- [x] `npm run verify` en verde.
- [x] `dev.db` sin cambios.
- [x] README, CHANGELOG, API, plan y trazabilidad actualizados.
- [x] Commit, push y CI en verde.

> Commit `c92490e`; CI `41338142600` en verde (1m47s) con 110/110 pruebas y 11/11 E2E. Tag anotado `v0.5.0`.

---

## 8. Registro de cierre

Fecha: 2026-11-01.

### 8.1. Empleados

Seed ampliado con la plantilla ficticia:

| Código | Nombre | Rol |
|---|---|---|
| `8` | Elena Vargas | `GERENTE` |
| `9` | Raúl Domínguez | `ENCARGADO` |
| `10` | Carmen Ortiz | `CAMARERO` |
| `11` | Iván Serrano | `CAMARERO` |
| `12` | Paula Méndez | `CAMARERO` |
| `13` | Hugo Navarro | `CAMARERO` |

Los códigos `0`–`7` se mantienen. La contraseña de seed sigue el patrón `ALFRED-EMPLEADO-<codigo>`.

### 8.2. Verificación

- `npm test`: **110/110 pruebas**.
- `npm run test:e2e`: **11/11**, incluidos los dos casos nuevos de Gerencia y las auditorías `axe-core`.
- `npm run verify`: en verde.
- Base desechable en todas las pruebas; `dev.db` solo recibió la migración y el seed de la plantilla, previa copia `prisma/backups/dev-20261101-192317.db`. Hash final de `dev.db`: `6471AB3A3C76F4928F8D65450FADE6EB856C9268D81796FFB42753332215F2C0`.

### 8.3. Decisiones que cambiaron durante la implementación

- El efectivo esperado trata los cobros antiguos sin `metodoPago` como efectivo, porque antes de G-4 no existía otra opción. Los cobros nuevos siempre guardan método.
- La UI pide el método en un diálogo propio (`PayDialog`) y deja `EFECTIVO` preseleccionado; así el flujo anterior sigue funcionando y los E2E existentes no se rompen.
- La pantalla de Gerencia usa pestañas y muestra Empleados solo al gerente. Encargado ve Histórico y Caja.

### 8.4. Deuda que queda para la Fase 4

- Pagos mixtos, parciales, propina, cambio y devolución.
- Idempotencia de cobro.
- Inmutabilidad fuerte de cierres mediante auditoría o disparadores.
- Ticket o recibo.
