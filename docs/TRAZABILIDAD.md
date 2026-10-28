# Matriz de trazabilidad — ALFRED

Documento del Bloque 0.2. Responde a una pregunta:

> Para cada requisito: ¿dónde está especificado, dónde está implementado y qué prueba demuestra que funciona?

No sustituye a `spec.md`. La especificación manda; esta matriz mide el grado de cumplimiento real.

---

## 1. Cómo leer la matriz

### 1.1. Estados

| Estado | Significado |
|---|---|
| ✅ | **Probado**: existe una prueba automatizada que lo demuestra |
| 🟨 | **Implementado sin prueba**: el código existe, pero no hay prueba automatizada |
| ⛔ | **Parcial o contradictorio**: hay código, pero no cumple el requisito completo o contradice la spec |
| ⬜ | **Pendiente**: no está implementado |
| 🚫 | **Fuera de alcance**: la spec lo excluye del MVP actual |

Una fila solo pasa a ✅ cuando hay una prueba automatizada que falla si el requisito se rompe. Una comprobación manual se anota en la columna de prueba como `manual`, pero no convierte la fila en ✅.

### 1.2. Regla de mantenimiento

- Cada bloque nuevo actualiza las filas que toca.
- No se borran filas: si un requisito cambia, se añade una nota y se actualiza el estado.
- Si aparece un requisito nuevo, se le asigna un ID y se enlaza con su sección de `spec.md`.
- Las pruebas se referencian por archivo y, cuando aporta claridad, por nombre del caso.

### 1.3. Convención de IDs

| Prefijo | Área |
|---|---|
| `AUT` | Autenticación, sesión y roles |
| `SAL` | Salón, mesas, walk-in y layout |
| `ASI` | Asientos y comandas |
| `UNI` | Unión de mesas y generalización |
| `PRO` | Producción: Cocina y Barra |
| `BUS` | Búsqueda global de productos |
| `API` | Contrato HTTP y errores |
| `SEG` | Seguridad transversal |
| `DAT` | Datos, migraciones, backups y reproducibilidad |
| `CAJ` | Caja y cobro |
| `RES` | Reservas |
| `GER` | Gerencia |
| `TIE` | Tiempo real |
| `FLX` | Comanda flexible |
| `STK` | Stock y 86 |
| `PWA` | PWA y offline |
| `INF` | Informes |
| `OPS` | Producción y operación |

---

## 2. Resumen

| Estado | Filas |
|---|---:|
| ✅ Probado | 20 |
| 🟨 Implementado sin prueba | 60 |
| ⛔ Parcial o contradictorio | 24 |
| ⬜ Pendiente | 68 |
| 🚫 Fuera de alcance | 0 |
| **Total** | **172** |

**Lectura:** tras el Bloque 2.5 hay 20 requisitos con prueba automatizada. La accesibilidad y el responsive ya tienen red de seguridad; la mayoría de las filas restantes siguen pendientes de actualizar en sus fases. Eso es exactamente lo que las fases 1 y 2 deben corregir.

---

## 3. Autenticación, sesión y roles

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| AUT-01 | Login por código de empleado | §5.1, §8 | El código `0` devuelve un usuario GERENTE; `2` devuelve CAMARERO | `src/routes/auth.ts`, `prisma/seed.ts` | `manual` | 🟨 |
| AUT-02 | Contraseñas con hash lento y sal | §11.4 | Dos hashes de la misma clave son distintos y ambos verifican | `src/auth/password.ts` | `tests/auth-core.test.ts` | ✅ |
| AUT-03 | Token JWT firmado y verificable | §11.4 | Un token válido devuelve el id; uno manipulado se rechaza | `src/auth/tokens.ts` | `tests/auth-core.test.ts` | ✅ |
| AUT-04 | Caducidad limitada del token | §11.4 | Un token caducado devuelve 401 | `src/auth/tokens.ts`, `src/config.ts` | — | 🟨 |
| AUT-05 | Middleware valida firma, expiración y usuario activo | §11.4 | Usuario inactivo o token inválido devuelve 401 | `src/middleware/requireAuth.ts` | — | 🟨 |
| AUT-06 | Autorización centralizada por rol | §5.2, §11.4 | `requireRole` permite solo los roles indicados | `src/middleware/requireAuth.ts` | — | 🟨 |
| AUT-07 | Solo ENCARGADO y GERENTE cobran | §5.2 | Camarero recibe 403; gerente recibe 200 | `src/routes/sala.ts:181` | `manual` | 🟨 |
| AUT-08 | Toda ruta interna exige JWT | §5.2, §11.4 | Sin token, cualquier ruta interna devuelve 401 | Solo `pagar` y `/api/usuarios` | — | ⛔ |
| AUT-09 | Rate limiting en login | §11.4 | Seis intentos fallidos seguidos devuelven 429 | `src/routes/auth.ts` | — | 🟨 |
| AUT-10 | Código único por empleado | Fase 1 | Dos camareros tienen códigos distintos y la auditoría los diferencia | — | — | ⬜ |
| AUT-11 | Logout y revocación de sesión | §11.4, §13 | Cerrar sesión invalida el token o al menos lo elimina del cliente | `web/src/api.ts` (solo borra del cliente) | — | ⛔ |
| AUT-12 | PIN opcional además del código | Fase 1 | El login puede exigir PIN | — | — | ⬜ |

---

## 4. Salón, mesas, walk-in y layout

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| SAL-01 | `GET /api/sala` devuelve 200 con mesas de comedor, terraza y barra | §10.2, §12 | La respuesta incluye las tres zonas | `src/sala/service.ts:27`, `src/routes/sala.ts:70` | — | 🟨 |
| SAL-02 | Cada mesa muestra estado, capacidad, ocupación y asientos | §12 | La tarjeta muestra esos datos | `web/src/components/TableCard.tsx`, `web/src/components/SeatMap` | — | 🟨 |
| SAL-03 | Un walk-in crea un servicio abierto y ocupa la mesa | §12 | `POST /api/servicios` responde 201 y la mesa queda ocupada | `src/sala/service.ts:54` | — | 🟨 |
| SAL-04 | Una mesa no puede tener dos servicios abiertos | §6.4, §12 | El segundo walk-in devuelve 409 | `src/sala/service.ts:95` | — | 🟨 |
| SAL-05 | Se puede crear una mesa nueva desde el walk-in | §8.1 | `createTable: true` crea mesa y servicio | `src/sala/service.ts:65` | — | 🟨 |
| SAL-06 | El salón se organiza en comedor, terraza y barra | §8.1 | La vista muestra las tres zonas | `web/src/components/FloorBoard.tsx` | — | 🟨 |
| SAL-07 | Reordenar layout guarda el orden visual | §8.1 | Tras arrastrar, `GET /api/sala` conserva el orden | `src/sala/service.ts:406`, `web/src/components/FloorBoard.tsx` | — | 🟨 |
| SAL-08 | Reordenar layout solo lo hacen ENCARGADO y GERENTE | §5.2 | Camarero recibe 403 | Ruta sin protección | — | ⛔ |
| SAL-09 | Una mesa unida muestra las etiquetas de todas sus mesas | §8.3, §12 | La tarjeta muestra `Mesa 2 + Mesa 3` | `src/sala/serialize.ts`, `web/src/components/TableCard.tsx` | — | 🟨 |
| SAL-10 | El estado se distingue sin depender solo del color | §8.6 | Hay texto además del color | `web/src/components/TableCard.tsx` | — | 🟨 |
| SAL-11 | El temporizador de mesa se actualiza sin recargar la página | §8.6 | El tiempo cambia solo cada 15 s | `web/src/App.tsx:53` | — | 🟨 |
| SAL-12 | La vista funciona en tablet y móvil | §4.2, §13 | Sin desbordes en pantallas pequeñas | `web/src/App.tsx`, `web/src/components/Inspector.tsx` | `e2e/accesibilidad.spec.ts` | ✅ |
| SAL-13 | Cancelar un servicio libera la mesa y registra motivo | §7.2 | El servicio queda CANCELADA y la mesa libre | `src/sala/service.ts:202` | — | 🟨 |
| SAL-14 | Un servicio no se borra: termina PAGADA o CANCELADA | §6.4 | No existe ruta de borrado físico | `prisma/schema.prisma` | — | 🟨 |

---

## 5. Asientos y comandas

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| ASI-01 | Solo se añaden líneas a servicios ABIERTA | §11.1 | Servicio cerrado devuelve 409 | `src/sala/service.ts:228` | — | 🟨 |
| ASI-02 | El producto debe estar activo | §11.1, §12 | Producto inactivo devuelve 404 y no crea línea | `src/sala/service.ts:233` | — | 🟨 |
| ASI-03 | El precio se copia del producto al crear la línea | §11.1, §12 | Cambiar la carta no altera líneas antiguas | `src/sala/service.ts:248` | — | 🟨 |
| ASI-04 | Una línea por asiento guarda mesa y número de asiento | §6.4, §8.6 | La línea tiene `mesaId` y `numeroAsiento` | `src/sala/service.ts:221` (nunca guarda `mesaId`) | — | ⛔ |
| ASI-05 | El asiento debe estar entre 1 y el pax | §6.4, §11.1, §12 | Asiento 99 devuelve 400 | Sin validación de rango | — | ⛔ |
| ASI-06 | Una línea compartida tiene mesa y asiento nulos | §6.4, §11.1 | `esCompartido: true` deja ambos nulos | `src/sala/service.ts:238` | — | 🟨 |
| ASI-07 | En modo GENERAL toda línea nueva es compartida | §11.1 | No se puede crear línea con asiento en GENERAL | `src/sala/service.ts:221` no comprueba el modo | — | ⛔ |
| ASI-08 | Anular exige motivo | §11.1, §12 | Motivo vacío devuelve 400 | `src/routes/sala.ts:46` | `tests/api.test.ts` | ✅ |
| ASI-09 | Anular registra actor y fecha | §11.1 | El evento guarda el usuario que anuló | `src/sala/service.ts:298` (actor opcional) | — | ⛔ |
| ASI-10 | Las líneas anuladas no se borran | §11.1 | Estado ANULADO conserva la fila | `src/sala/service.ts:298` | — | 🟨 |
| ASI-11 | Enviar pase cambia solo PENDIENTE a CALLED | §11.2 | Un reintento no vuelve a enviar lo ya enviado | `src/sala/service.ts:256` | — | 🟨 |
| ASI-12 | El envío es idempotente | §11.2, §12 | Repetir la llamada no duplica líneas ni eventos | Crea un evento en cada llamada | — | ⛔ |
| ASI-13 | Solo se envían líneas del servicio solicitado | §11.2 | No se llaman líneas de otro servicio | `src/sala/service.ts:262` | — | 🟨 |
| ASI-14 | Marcar listo solo desde CALLED | §7.3 | READY sobre PENDIENTE devuelve 409 | `src/sala/service.ts:281` | — | 🟨 |
| ASI-15 | Reducir pax por debajo de un asiento ocupado se rechaza | §6.4, §8.6, §12 | Devuelve 400 y no modifica el servicio | `src/sala/service.ts:115` no lo comprueba | — | ⛔ |
| ASI-16 | pax es entero positivo | §11.1.2 | `pax: 0` devuelve 400 | `src/routes/sala.ts:23` | `tests/api.test.ts` | ✅ |
| ASI-17 | pax no supera un máximo operativo configurable | §11.1.2 | Un pax enorme devuelve 400 | Sin máximo | — | ⛔ |
| ASI-18 | Aumentar pax no reasigna líneas | §11.1.2 | Las líneas conservan su asiento | `src/sala/service.ts:115` | — | 🟨 |
| ASI-19 | Una línea pertenece a un único servicio | §6.4 | La relación lo impide | `prisma/schema.prisma` | — | 🟨 |
| ASI-20 | Un servicio abierto tiene al menos una mesa | §6.4 | No se puede crear servicio sin mesa | `src/sala/service.ts:86` | — | 🟨 |
| ASI-21 | El número de mesa es único por zona y clase | §6.4 | Insertar duplicado falla | `prisma/schema.prisma` | — | 🟨 |
| ASI-22 | Las operaciones de ocupación o dinero son transaccionales | §6.4 | Si falla un paso, no queda estado parcial | Solo `merge`; `pay` no | — | ⛔ |
| ASI-23 | El número de asiento se numera en sentido horario | §8.2 | La UI muestra 1..N en orden | `web/src/components/Inspector.tsx` (`SeatMap`) | — | 🟨 |

---

## 6. Unión de mesas y generalización

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| UNI-01 | Unir mesas sin líneas mantiene `POR_ASIENTO` | §8.6, §11.1.1, §12 | El servicio conserva el modo | `src/sala/service.ts:133` (no lo cambia) | — | 🟨 |
| UNI-02 | Unir mesas con líneas activas pasa a `GENERAL` | §8.6, §11.1.1, §12 | El servicio queda en GENERAL | No implementado | — | ⛔ |
| UNI-03 | Generalizar pone mesa y asiento a nulo en líneas activas | §11.1.1 | Las líneas activas quedan compartidas | No implementado | — | ⛔ |
| UNI-04 | Cada línea generalizada audita su mesa y asiento de origen | §8.3, §11.1.1, §12 | Hay un evento por línea con el origen | No implementado | — | ⛔ |
| UNI-05 | La unión es transaccional | §11.1.1 | Si falla, no se mueve nada | `src/sala/service.ts:145` | — | 🟨 |
| UNI-06 | La unión no modifica líneas anuladas | §11.1.1 | Las anuladas conservan servicio y estado | `src/sala/service.ts:163` | — | 🟨 |
| UNI-07 | Generalizar no cambia cantidades, precios ni estados | §11.1.1 | Solo cambia mesa, asiento y compartido | No implementado | — | ⛔ |
| UNI-08 | Unir mesas conserva la identidad de cada línea | §12 | Los ids de línea se mantienen | `src/sala/service.ts:162` (mueve las líneas) | — | 🟨 |
| UNI-09 | Una mesa no pertenece a dos servicios abiertos tras unir | §6.4 | La mesa origen deja de estar en el servicio absorbido | `src/sala/service.ts:160` | — | 🟨 |
| UNI-10 | El paso de `POR_ASIENTO` a `GENERAL` es irreversible | §6.4 | No hay operación inversa | — | — | ⬜ |

---

## 7. Cocina y Barra

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| PRO-01 | Cocina recibe solo destino COCINA | §11.2 | Un producto COCINA no aparece en Barra | `web/src/lib/estacion.ts` usa categoría, no destino | — | ⛔ |
| PRO-02 | Barra recibe solo destino BARRA | §11.2 | Un producto BARRA no aparece en Cocina | `web/src/lib/estacion.ts` usa categoría, no destino | — | ⛔ |
| PRO-03 | Las líneas de mesas unidas no se duplican en la cola | §8.3 | Cada línea aparece una vez | `web/src/components/KitchenBoard.tsx:50` | — | 🟨 |
| PRO-04 | Los productos compartidos se muestran sin asiento | §11.2 | Aparece "Compartido", no "Asiento 0" | `web/src/components/KitchenBoard.tsx:43` | — | 🟨 |
| PRO-05 | Las colas no exponen datos personales innecesarios | §11.2 | Solo mesa, asiento, producto y tiempo | `web/src/components/KitchenBoard.tsx` | — | 🟨 |
| PRO-06 | Marcar listo desde la cola | §7.3 | La línea pasa a READY | `web/src/components/KitchenBoard.tsx`, `src/routes/sala.ts:142` | — | 🟨 |
| PRO-07 | Tiempo transcurrido visible por línea | §6 (Fase 6) | La fila muestra minutos | `web/src/components/KitchenBoard.tsx` | — | 🟨 |
| PRO-08 | Colores por urgencia de tiempo | Fase 6 | Verde, ámbar y rojo según minutos | `web/src/components/KitchenBoard.tsx` | — | 🟨 |
| PRO-09 | Cocina y Barra se actualizan solas | Fase 6 | Otra pantalla ve el cambio sin refrescar | No implementado | — | ⬜ |
| PRO-10 | Aviso sonoro opcional | Fase 6 | Suena al entrar una comanda | No implementado | — | ⬜ |

---

## 8. Búsqueda global de productos

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| BUS-01 | Busca en todos los productos activos | §9.1 | `q=agua` devuelve resultados de cualquier categoría | No existe endpoint ni UI | — | ⬜ |
| BUS-02 | Búsqueda parcial por nombre | §9.1 | `q=atun` encuentra "Tartar de atún" | No implementado | — | ⬜ |
| BUS-03 | Insensible a mayúsculas y acentos | §9.1 | `atun` y `ATÚN` dan el mismo resultado | No implementado | — | ⬜ |
| BUS-04 | No devuelve productos inactivos | §9.1, §12 | Un producto inactivo no aparece | No implementado | — | ⬜ |
| BUS-05 | Encuentra productos de Cocina y Barra | §9.4, §12 | Buscar agua estando en Cocina la encuentra | No implementado | — | ⬜ |
| BUS-06 | Campo de búsqueda visible en salón o inspector | §9.3 | Hay un campo de búsqueda | No implementado | — | ⬜ |
| BUS-07 | Navegación con teclado y cierre con Escape | §9.3 | Flechas y Escape funcionan | No implementado | — | ⬜ |
| BUS-08 | Añadir desde búsqueda respeta el asiento activo | §9.3, §9.4 | La línea se crea en el asiento seleccionado | No implementado | — | ⬜ |
| BUS-09 | `GET /api/productos?q=...` | §10.2 | La ruta responde con productos filtrados | No existe | — | ⬜ |

---

## 9. Contrato HTTP y errores

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| API-01 | Prefijo `/api` y JSON | §10.1 | Las rutas internas usan `/api` | `src/app.ts` | — | 🟨 |
| API-02 | Errores con formato `{ code, message, details? }` | §10.1 | Un 404 devuelve ese formato | `src/middleware/errorHandler.ts` | `tests/api.test.ts` | ✅ |
| API-03 | Códigos 200, 201, 400, 401, 403, 404, 409, 422, 500 | §10.1 | Cada caso usa el código correcto | Varias rutas | Parcial en tests | 🟨 |
| API-04 | `GET /health` responde 200 | §10.2 | Devuelve `{ status: "ok" }` | `src/app.ts:33` | `tests/api.test.ts` | ✅ |
| API-05 | Identificador de petición en la respuesta | §2.4 (Fase 2) | `X-Request-Id` presente y respetado | `src/middleware/requestId.ts` | `tests/api.test.ts` | ✅ |
| API-06 | JSON inválido devuelve 400 | §10.1 | No devuelve 500 | `src/middleware/errorHandler.ts` | `tests/api.test.ts` | ✅ |
| API-07 | Cuerpo máximo de 100 KB | §11.4 | Un cuerpo de 200 KB devuelve 413 | `src/app.ts:31` | `tests/api.test.ts` | ✅ |
| API-08 | Validación de entrada en todas las rutas | §11.4 | Un cuerpo inválido devuelve 400 | Zod en rutas | `tests/api.test.ts` (parcial) | 🟨 |
| API-09 | Validación de identificadores de ruta | §10.1 | `abc` devuelve 400 | `src/routes/sala.ts:11` | `tests/api.test.ts` | ✅ |
| API-10 | `GET /api/productos?q=...` | §10.2 | Ruta de búsqueda | No existe | — | ⬜ |
| API-11 | Rutas futuras de reservas y caja | §10.3 | Existen cuando llega su fase | No implementadas | — | ⬜ |
| API-12 | Documentación de API (OpenAPI) | Fase 2 | Contrato publicado | No existe | — | ⬜ |

---

## 10. Seguridad transversal

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| SEG-01 | JWT firmado con secreto de configuración | §11.4 | Cambiar el secreto invalida tokens | `src/auth/tokens.ts`, `src/config.ts` | `tests/auth-core.test.ts` (firma) | 🟨 |
| SEG-02 | Expiración del token | §11.4 | Token caducado devuelve 401 | `src/config.ts` | — | 🟨 |
| SEG-03 | Validación de usuario activo | §11.4 | Usuario desactivado no puede operar | `src/middleware/requireAuth.ts:30` | — | 🟨 |
| SEG-04 | Autorización por rol en cada ruta interna | §5.2 | Ninguna escritura abierta | Solo cobro y usuarios | — | ⛔ |
| SEG-05 | 401 sin token y 403 sin permiso | §12 | Ambos casos probados | `requireAuth`, `requireRole` | `manual` (solo cobro) | 🟨 |
| SEG-06 | CORS restringido en producción | §11.4 | Origen no permitido no recibe CORS | `src/app.ts:16` | — | 🟨 |
| SEG-07 | Rate limiting en reservas públicas | §11.4 | Ráfaga de reservas se limita | No implementado | — | ⬜ |
| SEG-08 | No registrar contraseñas, tokens ni pagos | §11.4 | Los logs no contienen secretos | `src/middleware/requestLogger.ts` (sin prueba) | — | 🟨 |
| SEG-09 | No confiar en roles, importes ni estados del cliente | §11.4 | El servidor ignora esos campos | Roles desde JWT; totales calculados | — | 🟨 |
| SEG-10 | Cabeceras de seguridad HTTP | Fase 1.6 | Helmet o equivalente | No implementado | — | ⬜ |
| SEG-11 | Revocación y rotación de JWT | §13 | Un token robado puede revocarse | No implementado | — | ⬜ |

---

## 11. Datos, migraciones y reproducibilidad

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| DAT-01 | Una base nueva se migra desde cero | §12 | `npm run db:migrate` crea la base | `prisma/migrations` | `manual` (clean-room 2026-10-27) | 🟨 |
| DAT-02 | El seed es idempotente | §12 | Ejecutarlo dos veces no duplica | `prisma/seed.ts` | `manual` (una ejecución) | 🟨 |
| DAT-03 | Migraciones versionadas | §12 | Cada cambio tiene carpeta propia | `prisma/migrations` | — | 🟨 |
| DAT-04 | La base y las copias no se versionan | §6 | `.gitignore` las excluye | `.gitignore` | `manual` (`git check-ignore`) | 🟨 |
| DAT-05 | Copia de seguridad con retención de 20 | §6 | `npm run db:backup` crea y rota copias | `scripts/backup-db.mjs` | `manual` | 🟨 |
| DAT-06 | Restauración probada | §6 | Se restaura una copia y la app arranca | Procedimiento documentado | — | ⬜ |
| DAT-07 | Typecheck, build y tests en verde | §12 | Los cuatro comandos pasan | `package.json` | `manual` (2026-10-27) | 🟨 |
| DAT-08 | Instalación reproducible desde cero | §12 | Clean-room completo | `README.md` | `manual` (2026-10-27) | 🟨 |
| DAT-09 | Base de datos desechable por ejecución de tests | Fase 2.1 | Los tests no tocan `dev.db` | No implementado | — | ⬜ |
| DAT-10 | CI ejecuta typecheck, builds y tests | Fase 2.5 | Cada push verifica | No existe | — | ⬜ |
| DAT-11 | Pruebas E2E de flujos completos | Fase 2.2 | Abrir mesa → pedir → cobrar | No existe | — | ⬜ |

---

## 12. Caja y cobro

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| CAJ-01 | Cada movimiento de dinero tiene importe, método, tipo, actor y referencia | §11.3 | Existe una entidad de pago | No existe | — | ⬜ |
| CAJ-02 | El estado PAGADO se deriva de movimientos válidos | §11.3 | No se marca pagado sin pago | `POST /pagar` marca PAGADA sin movimiento | — | ⛔ |
| CAJ-03 | No se cobra dos veces por doble clic | Fase 4 | La segunda petición no duplica el cobro | Sin idempotencia | — | ⬜ |
| CAJ-04 | Efectivo, tarjeta y pago mixto | Fase 4 | Se registra el método | No implementado | — | ⬜ |
| CAJ-05 | Pago parcial y saldo pendiente | Fase 4 | Se puede pagar una parte | No implementado | — | ⬜ |
| CAJ-06 | División por asiento o importe | Fase 4 | El cliente elige cómo dividir | Solo campo `splitModo`, sin pagos | — | ⛔ |
| CAJ-07 | Propina y cambio | Fase 4 | Se calcula el cambio | No implementado | — | ⬜ |
| CAJ-08 | Ticket o recibo | Fase 4 | Se genera un resumen | No implementado | — | ⬜ |
| CAJ-09 | Devolución con motivo e idempotencia | §11.3 | No se devuelve más de lo cobrado | No implementado | — | ⬜ |
| CAJ-10 | Arqueo desde movimientos, no desde el navegador | §11.3 | El efectivo esperado sale del servidor | No implementado | — | ⬜ |
| CAJ-11 | Los cierres no se modifican; se ajustan con auditoría | §11.3 | Un cierre es inmutable | No implementado | — | ⬜ |
| CAJ-12 | Histórico de cuentas cobradas | Fase 3 | Se consultan cuentas cerradas | No implementado | — | ⬜ |

---

## 13. Reservas

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| RES-01 | Crear reserva pública | §10.3 | `POST /api/public/reservas` responde 201 | No implementado | — | ⬜ |
| RES-02 | Estados y transiciones de reserva | §7.1 | PENDIENTE → CONFIRMADA → EN_MESA | Modelo existe; sin flujo | — | ⬜ |
| RES-03 | La reserva no ocupa la mesa en el mapa real | §6.6, §12 | La mesa sigue libre | No implementado | — | ⬜ |
| RES-04 | Check-in crea servicio y ocupa la mesa | §6.6, §12 | Aparece ocupación real | No implementado | — | ⬜ |
| RES-05 | No-show no crea servicio | §6.6, §12 | La mesa sigue libre | No implementado | — | ⬜ |
| RES-06 | Mapa de reservas por fecha y hora | §6.6 | Vista separada del mapa real | No implementado | — | ⬜ |
| RES-07 | Una reserva no tiene dos servicios | §6.6 | Invariante comprobada | No implementado | — | ⬜ |
| RES-08 | Reglas de solapamiento y tolerancia | §13 | Definidas antes de implementar | Decisión pendiente | — | ⬜ |

---

## 14. Gerencia

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| GER-01 | Gestionar carta: alta, baja y edición | Fase 3 | El gerente modifica productos | No implementado | — | ⬜ |
| GER-02 | Cambiar precios | Fase 3 | El precio nuevo aplica a líneas nuevas | No implementado | — | ⬜ |
| GER-03 | Gestionar empleados y códigos | Fase 3 | Alta/baja y código único | Backend parcial, códigos compartidos | — | ⛔ |
| GER-04 | Consultar cuentas históricas | Fase 3 | Filtro por fecha y detalle | No implementado | — | ⬜ |
| GER-05 | Arqueo de caja | Fase 3 | Apertura, cierre y diferencia | No implementado | — | ⬜ |
| GER-06 | Auditar quién hizo cada acción | Fase 1.4 | Todos los eventos tienen actor | Actor opcional y rutas abiertas | — | ⛔ |
| GER-07 | Proteger al último gerente | Fase 3 | No se puede eliminar el único gerente | No implementado | — | ⬜ |

---

## 15. Tiempo real, comanda flexible, stock, PWA e informes

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| TIE-01 | Cocina y Barra se actualizan sin refrescar | Fase 6 | Dos pantallas ven el cambio | No implementado | — | ⬜ |
| TIE-02 | Reconexión tras perder la red | Fase 6 | El cliente se recupera solo | No implementado | — | ⬜ |
| TIE-03 | Aviso sonoro opcional | Fase 6 | Suena al entrar comanda | No implementado | — | ⬜ |
| FLX-01 | Notas y alergias por línea | Fase 7 | Se guardan y se ven en producción | Campo `notas` existe; sin API ni UI | — | ⛔ |
| FLX-02 | Cambiar cantidad de una línea | Fase 7 | Se actualiza el total | No implementado | — | ⬜ |
| FLX-03 | Mover línea entre asientos | Fase 7 | Cambia de asiento sin duplicar | No implementado | — | ⬜ |
| FLX-04 | Modificadores de producto | Fase 7 | "Sin cebolla" se registra | No implementado | — | ⬜ |
| STK-01 | Marcar producto agotado (86) | Fase 8 | El producto deja de ofrecerse | Solo campo `activo` | — | ⛔ |
| STK-02 | No se puede pedir un producto agotado | Fase 8, §12 | Devuelve error | `src/sala/service.ts:233` | — | 🟨 |
| STK-03 | La carta muestra el producto agotado | Fase 8 | Aparece como no disponible | No implementado | — | ⬜ |
| PWA-01 | Manifest y service worker | Fase 9 | La app se instala | No implementado | — | ⬜ |
| PWA-02 | Carga básica sin red | Fase 9 | Abre sin conexión | No implementado | — | ⬜ |
| PWA-03 | Cola de acciones y reintento | Fase 9 | Un pedido hecho sin red se sincroniza | No implementado | — | ⬜ |
| PWA-04 | Indicadores de conexión y sincronización | Fase 9 | Se ve el estado | No implementado | — | ⬜ |
| INF-01 | Ventas por día | Fase 10 | Informe filtrable | No implementado | — | ⬜ |
| INF-02 | Productos más vendidos | Fase 10 | Ranking por periodo | No implementado | — | ⬜ |
| INF-03 | Tiempos de producción | Fase 10 | Tiempo medio por línea | No implementado | — | ⬜ |
| INF-04 | Rendimiento por empleado | Fase 10 | Ventas o comandas por actor | No implementado | — | ⬜ |
| INF-05 | Exportación CSV | Fase 10 | Descarga de datos | No implementado | — | ⬜ |

---

## 16. Accesibilidad y responsive

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| ACC-01 | Los modales son diálogos nombrados y con foco atrapado | `ACCESIBILIDAD.md` A-5, CA-01 | `Tab` y `Shift+Tab` no salen del diálogo | `web/src/lib/useModalFocus.ts` | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-02 | `Escape` cierra el diálogo superior y devuelve el foco | A-5, CA-02 | Al cerrar, el disparador vuelve a tener el foco | `web/src/lib/useModalFocus.ts` | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-03 | Las pantallas principales no tienen violaciones axe A/AA | A-1, CA-04 | `axe-core` devuelve cero violaciones | Componentes web | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-04 | Las etiquetas visibles están asociadas a su campo | CA-05 | Login, walk-in, pax y promo tienen nombre accesible | Componentes web | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-05 | Navegación con landmark, salto de contenido y vista activa | A-7, CA-06 | Existen `nav`, enlace de salto y `aria-current` | `web/src/App.tsx` | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-06 | Sin scroll horizontal en móvil y tablet | A-3, CA-07 | `scrollWidth` no supera el viewport | Layout responsive | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-07 | El inspector se apila y ocupa el ancho en móvil | A-3, CA-08 | Una columna a `390px` y sin desbordes | `web/src/components/Inspector.tsx` | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-08 | Objetivos táctiles principales de al menos `44px` | A-4, CA-09 | Controles principales ≥44; compactos ≥24 | `web/src/index.css`, componentes | `e2e/accesibilidad.spec.ts` | ✅ |
| ACC-09 | Errores y acuses se anuncian con regiones vivas | A-6, CA-10 | `role="alert"` y `role="status"` visibles | `web/src/App.tsx`, modales | `e2e/accesibilidad.spec.ts` | ✅ |

---

## 17. Producción y operación

| ID | Requisito | Fuente | Criterio verificable | Implementación | Prueba | Estado |
|---|---|---|---|---|---|---|
| OPS-01 | PostgreSQL en producción | Fase 11 | La app usa Postgres | SQLite | — | ⬜ |
| OPS-02 | Despliegue con HTTPS y dominio | Fase 11 | URL pública | No desplegado | — | ⬜ |
| OPS-03 | Copias automáticas y restauración probada | Fase 11 | Se recupera tras un fallo | Copia manual | — | ⬜ |
| OPS-04 | Monitorización, logs y alertas | Fase 11 | Se detectan errores | Logs básicos | — | ⬜ |
| OPS-05 | Release `v1.0.0` con changelog | Fase 11 | Versión publicada | Tag `v0.1.0` | — | ⬜ |

---

## 18. Discrepancias detectadas

Estas no son fallos nuevos: son diferencias entre lo que dice la spec y lo que hace el código. Deben resolverse en la fase correspondiente.

| ID | Discrepancia | Spec | Código | Decisión propuesta |
|---|---|---|---|---|
| D-01 | Cocina/Barra se separan por categoría, no por `destino` | §11.2 | `web/src/lib/estacion.ts` | Decidir fuente única de verdad y corregir spec o código |
| D-02 | Promociones y split existen aunque la spec los excluye del MVP | §2.3, §13 | `src/sala/service.ts:328`, `:367` | Mantener como experimental o retirar en Fase 3 |
| D-03 | `POST /pagar` marca PAGADA sin movimiento financiero | §10.5 | `src/sala/service.ts:384` | Redefinir en Fase 4 con pagos inmutables |
| D-04 | `modoAsientos` existe pero no se usa al unir mesas | §8.3, §11.1.1 | `src/sala/service.ts:133` | Implementar generalización en Fase 7 |
| D-05 | Solo el cobro está protegido | §5.2, §11.4 | `src/routes/sala.ts` | Cerrar en Bloque 1.3 |
| D-06 | La línea nunca guarda `mesaId` | §6.4, §8.6 | `src/sala/service.ts:221` | Corregir en Fase 7 |
| D-07 | No se valida el rango del asiento | §6.4, §11.1 | `src/routes/sala.ts:38` | Corregir en Fase 1.2 |

---

## 19. Huecos de prueba prioritarios

Ordenados por riesgo, no por facilidad. Estos son los candidatos naturales para las fases 1 y 2.

1. **AUT-08 / SEG-04**: ninguna escritura debe quedar abierta.
2. **UNI-02, UNI-03, UNI-04**: unir mesas con pedidos no generaliza ni audita.
3. **ASI-04, ASI-05, ASI-07**: la línea no guarda mesa y no valida asiento.
4. **ASI-15 / ASI-17**: reducir pax no valida asientos ocupados.
5. **ASI-12**: el envío no es idempotente.
6. **CAJ-02**: el cobro actual no tiene trazabilidad financiera.
7. **BUS-01..09**: la búsqueda global está especificada y no existe.
8. **PRO-01..02**: la separación Cocina/Barra contradice la spec.
9. **DAT-09**: los tests dependen de `dev.db` y no de una base desechable.
10. **DAT-10 / DAT-11**: no hay CI ni E2E.

---

## 20. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 0.2 | Creación de la matriz con 163 filas, discrepancias y huecos de prueba |
| 2026-10-28 | 2.5 | 9 filas de accesibilidad/responsive en ✅; SAL-12 pasa a probado; resumen actualizado a 172 filas |
