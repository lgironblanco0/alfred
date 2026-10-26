# Plan de construcción de ALFRED

**Versión:** 2.1 — Reconciliación SDD con dos mapas  
**Estado:** salón funcional en desarrollo; autenticación activa y cobro protegido por rol  
**Última actualización:** 2026-10-24

---

## 1. Objetivo y alcance

Construir ALFRED de forma incremental, manteniendo coherencia entre:

- La especificación funcional.
- El modelo de dominio.
- El contrato de API.
- El esquema de Prisma y las migraciones.
- La base de datos SQLite.
- El frontend React.

El objetivo inmediato no es añadir funcionalidades, sino **reconciliar** lo que la especificación describe, lo que el código implementa y lo que la base de datos contiene.

El MVP del salón incluye:

- Autenticación y roles.
- Salón visual con mesas y asientos numerados.
- Walk-in.
- Unión de mesas.
- Reordenación del layout.
- Comandas por asiento.
- Búsqueda global de productos activos.
- Envío a Cocina y Barra.
- Anulación lógica con auditoría.

Quedan aplazados:

- Promociones.
- Split de cuenta.
- Cobro directo sin caja.
- Reservas, check-in y mapa de reservas.
- Caja, devoluciones y arqueo.
- No-show con cobro.
- Pedidos anticipados.
- Multi-restaurante.

---

## 2. Estado de partida auditado

### 2.1. Código actual

| Área | Archivos |
|---|---|
| Arranque y middleware | `src/app.ts`, `src/server.ts`, `src/errors.ts`, `src/asyncRoute.ts` |
| Acceso a datos | `src/db.ts`, `prisma/schema.prisma`, `prisma/seed.ts` |
| Salón | `src/routes/sala.ts`, `src/sala/service.ts`, `src/sala/serialize.ts`, `src/sala/include.ts` |
| Frontend | `web/src/App.tsx`, `web/src/api.ts`, `web/src/types.ts`, `web/src/components/*`, `web/src/lib/format.ts` |
| Estilos | `web/src/index.css`, `web/vite.config.ts` |

### 2.2. Base de datos local

Comprobación de solo lectura sobre `prisma/dev.db`:

| Tabla | Filas |
|---|---:|
| `Mesa` | 15 |
| `Usuario` | 0 |
| `Reserva` | 0 |
| `Producto` | 0 |
| `AsientoComanda` | 0 |
| `_prisma_migrations` | 2 migraciones |

Tablas que el código ya usa pero que **no existen** en `dev.db`:

- `Servicio`
- `ServicioMesa`
- `LineaPedido`
- `PromoCodigo`
- `EventoServicio`

Columna que el código ya usa pero que **no existe** en `dev.db`:

- `Mesa.layoutOrder`

Consecuencia: `GET /api/sala` no puede funcionar contra la base actual. El código consulta tablas y columnas que aún no se han migrado.

### 2.3. Discrepancias principales

| Área | Spec inicial | Implementación actual | Resolución |
|---|---|---|---|
| Ruta del salón | `GET /api/mesas/salon` | `GET /api/sala` | Se adopta `/api/sala` como contrato del MVP. |
| Entidad principal | `Reserva` y `AsientoComanda` | `Servicio` y `LineaPedido` | Se separan Reserva y Servicio; `LineaPedido` es la comanda operativa. |
| Comandas | `PUT /api/reservas/:id/asiento/:numeroAsiento/comanda` | `POST /api/servicios/:id/items` | Se adopta el contrato de servicio; las rutas de reserva se aplazan. |
| Envío | `POST /api/reservas/:id/comanda/enviar` | `POST /api/servicios/:id/call` | Se adopta el contrato de servicio. |
| Estados | Español | `CALLED`, `READY`, `PAID` | Se documenta el mapeo y no se renombra todavía. |
| Producto | `tipoProducto` COMIDA/BEBIDA | `destino` COCINA/BARRA | `destino` es la clasificación operativa. |
| Legado | `AsientoComanda` | Sin uso | Se conserva como legado, sin escrituras nuevas. |
| Caja | Arqueo y devoluciones | Cobro directo | El cobro directo no se considera cierre de caja. |
| Seguridad | JWT y roles | Sin auth | Se implementará antes de ampliar el salón. |
| Pruebas | Plan exige tests | `npm test` es un placeholder | Se añadirá una suite real. |

### 2.4. Decisiones ya aprobadas

- `Reserva` es intención previa.
- `Servicio` es ocupación real.
- `LineaPedido` es la única comanda operativa.
- `AsientoComanda` queda como legado.
- `LineaPedido` tendrá `mesaId` y `notas` opcionales.
- El contrato del MVP usa `/api/sala` y `/api/servicios`.
- El MVP incluye walk-in, unión de mesas, layout y búsqueda.
- Se aplazan promociones, split y cobro directo.
- Se representarán dos mapas del mismo restaurante: reservas (futuro) y real (presente).
- El check-in es la única operación que convierte una reserva en servicio.
- `Servicio.modoAsientos` admite `POR_ASIENTO` y `GENERAL`.
- Unir mesas con pedidos generaliza las líneas y registra su origen en `EventoServicio`.
- Unir mesas sin pedidos conserva el modo `POR_ASIENTO`.
- Reducir `pax` por debajo de un asiento ocupado se rechaza.

### 2.5. Nivel de evidencia

**Comprobado:**

- El código del salón usa `Servicio` y `LineaPedido`.
- La base local tiene 15 mesas, 0 usuarios, 0 reservas, 0 productos y 0 líneas.
- Faltan tablas y la columna `layoutOrder`.
- No hay autenticación ni suite de pruebas.
- Las rutas actuales son `/api/sala` y `/api/servicios/...`.

**Deducido:**

- `GET /api/sala` no puede funcionar contra la base actual porque consulta tablas inexistentes.
- `Reserva` y `Servicio` representan etapas distintas del negocio.
- `AsientoComanda` y `LineaPedido` son duplicados conceptuales; mantener ambos escribibles sería una mala decisión.

**Desconocido o pendiente:**

- Si `dev.db` es desechable o contiene datos que deben conservarse.
- El comportamiento HTTP exacto de cada ruta, porque no se ejecutó el servidor.
- Las reglas definitivas de reservas, caja y no-show.
- Si los estados persistidos se renombrarán al español.
- Si se añadirá un alias `/api/mesas/salon`.

### 2.6. Diagnóstico exacto del drift

Comprobado el 2026-10-24 con `prisma migrate status`, `prisma migrate diff` y lectura directa de SQLite en modo `readonly`.

**Hallazgo principal:** `prisma migrate status` responde “Database schema is up to date!”, pero eso solo significa que las 2 migraciones registradas están aplicadas. **No significa que la base coincida con `schema.prisma`.**

| Elemento | En migraciones | En `schema.prisma` | En `dev.db` |
|---|---:|---:|---:|
| `Usuario` | Sí | Sí | Sí |
| `Mesa` con `zona` y `clase` | Sí | Sí | Sí |
| `Reserva` | Sí | Sí | Sí |
| `Producto` | Sí, sin `categoria` | Sí, con `categoria` | Sí, sin `categoria` |
| `AsientoComanda` | Sí | Sí | Sí |
| `Servicio` | No | Sí | No |
| `ServicioMesa` | No | Sí | No |
| `LineaPedido` | No | Sí | No |
| `PromoCodigo` | No | Sí | No |
| `EventoServicio` | No | Sí | No |
| `Mesa.layoutOrder` | No | Sí | No |

**Diferencia que generaría Prisma hoy:**

- Crear `Servicio`, `ServicioMesa`, `LineaPedido`, `PromoCodigo` y `EventoServicio`.
- Añadir `Mesa.layoutOrder` mediante reconstrucción de la tabla.
- Añadir `Producto.categoria` mediante reconstrucción de la tabla.

**Diferencia que Prisma no puede generar todavía:** el `schema.prisma` aún no contiene los campos aprobados en la Fase 0.5:

- `Servicio.modoAsientos`.
- `LineaPedido.mesaId`.
- `LineaPedido.notas`.

Por tanto, la migración de reconciliación no puede generarse solo desde el esquema actual: **primero hay que actualizar `schema.prisma`** con esos campos.

**Observaciones técnicas:**

- `prisma migrate diff` propone `DROP TABLE` + `ALTER TABLE ... RENAME` para `Mesa` y `Producto`. Aunque copia los datos, no es estrictamente aditivo. Para SQLite es preferible un `ALTER TABLE ... ADD COLUMN` manual.
- `Producto.categoria` tiene como valor por defecto `COCINA`, que es un destino, no una categoría de carta. **Decidido:** se elimina el valor por defecto; `categoria` es obligatoria al crear un producto. Como `Producto` tiene 0 filas, la tabla puede reconstruirse sin riesgo de pérdida.
- `Servicio` conserva `descuentoCodigo`, `descuentoTipo`, `descuentoValor` y `splitModo` por compatibilidad con el código actual, aunque promociones y split estén aplazados.
- No hay datos en las tablas nuevas, así que no hay riesgo de pérdida en ellas. Las 15 mesas sí deben conservarse.
- `EventoServicio.actorId` no forma parte de esta migración; se añadirá con autenticación.

**Resuelto el 2026-10-24.** La migración `20261024130000_reconciliacion_salon` se probó primero con `prisma migrate deploy` sobre una copia desechable y después se aplicó a `dev.db`. Verificación posterior: 3 migraciones registradas, 15 mesas conservadas, `layoutOrder` entre 1 y 5, `integrity_check` correcto, `foreign_key_check` vacío, `prisma migrate diff` sin diferencias y `GET /api/sala` con 15 mesas. La copia de seguridad previa es `prisma/backups/dev-2026-10-24-135048.db`.

---

## 3. Principios de diseño

1. **La API es la autoridad.** El frontend no decide importes, permisos, estados ni disponibilidad.
2. **Autorización por defecto denegada.** Cada ruta interna exige autenticación y permiso.
3. **Estados explícitos.** Las transiciones se validan en servidor.
4. **Operaciones atómicas.** Ocupación, unión de mesas y dinero se validan y persisten en transacción.
5. **Historial en vez de borrado.** No se eliminan registros con impacto operativo o financiero.
6. **Importes exactos.** El dinero se guarda como entero en céntimos.
7. **Migraciones aditivas.** No se destruyen tablas ni datos para avanzar.
8. **Contrato antes que implementación.** Las rutas y estados se documentan antes de codificarlos.
9. **Pasos pequeños.** Cada fase debe dejar el sistema ejecutable y verificable.

---

## 4. Modelo canónico

La especificación detalla entidades, relaciones, invariantes y estados. El plan resume la decisión operativa:

- `Reserva` representa la intención futura.
- `Servicio` representa la ocupación real.
- `ServicioMesa` permite mesas unidas.
- `Servicio.modoAsientos` indica cómo se tratan las líneas: `POR_ASIENTO` o `GENERAL`.
- `LineaPedido` pertenece siempre a un servicio.
- `LineaPedido` puede guardar `mesaId` y `numeroAsiento` para identificar “Mesa 2 · Asiento 3”.
- Las líneas compartidas tienen `mesaId` y `numeroAsiento` nulos.
- En modo `GENERAL`, todas las líneas activas son compartidas.
- El precio unitario se copia al crear la línea.
- `AsientoComanda` no se usa en el flujo nuevo.
- `PromoCodigo` se conserva por compatibilidad, pero no forma parte del MVP.

### 4.1. Dos mapas

- El **mapa de reservas** es una vista del futuro. No crea ocupación.
- El **mapa real** es una vista del presente. Solo muestra servicios abiertos.
- Ambos leen las mismas entidades y comparten la misma `Mesa`.
- Una reserva confirmada no ocupa la mesa en el mapa real.
- El check-in crea el servicio y traslada la mesa al mapa real.
- Un no-show o una cancelación no crean servicio ni modifican el mapa real.

### 4.2. Generalización al unir mesas

1. Si el servicio no tiene líneas activas, se mantiene `POR_ASIENTO`.
2. Si tiene líneas activas, pasa a `GENERAL`.
3. Las líneas activas se marcan como compartidas y pierden `mesaId` y `numeroAsiento`.
4. Antes de generalizar, se guarda en `EventoServicio` el origen de cada línea.
5. La operación es atómica e irreversible dentro del servicio.
6. Las líneas anuladas no se modifican.

La relación `Reserva` → `Servicio` se añadirá en la fase de reservas. No forma parte de la migración de reconciliación.

---

## 5. Estructura del proyecto

### 5.1. Estructura actual

```text
src/
  app.ts
  server.ts
  db.ts
  errors.ts
  asyncRoute.ts
  routes/
    sala.ts
  sala/
    service.ts
    serialize.ts
    include.ts
prisma/
  schema.prisma
  seed.ts
  migrations/
web/
  src/
    App.tsx
    api.ts
    types.ts
    components/
    lib/
```

### 5.2. Estructura objetivo

Sin reescribir lo que ya funciona, se irá separando por dominio cuando exista una razón concreta:

```text
src/
  app.ts
  server.ts
  config/
  middleware/
    authenticate.ts
    authorize.ts
    validate.ts
    error-handler.ts
  modules/
    auth/
    users/
    sala/
    reservas/
    carta/
    comandas/
    cocina/
    barra/
    caja/
  lib/
    prisma.ts
    errors.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
web/
  src/
    components/
    features/
    lib/
    types/
```

La estructura objetivo no se aplica de golpe. Se migra cuando cada módulo tenga pruebas y responsabilidades claras.

---

## 6. Estrategia de migración y preservación de datos

### 6.1. Inventario

- 15 mesas.
- 0 usuarios.
- 0 reservas.
- 0 productos.
- 0 líneas de asiento.
- 2 migraciones aplicadas.

Aunque el volumen sea bajo, la base se tratará como si tuviera datos reales.

### 6.2. Reglas obligatorias

1. Copia de seguridad de `prisma/dev.db` antes de cualquier migración.
2. Probar la migración sobre una copia, nunca directamente sobre la base principal.
3. No usar `prisma migrate reset` sobre datos reales.
4. No usar `prisma db push` sobre la base de desarrollo con datos.
5. Preferir migraciones aditivas.
6. No eliminar tablas heredadas en la reconciliación.
7. Rellenar nuevas columnas de forma determinista.
8. Verificar conteos antes y después.
9. Verificar el seed y `GET /api/sala` después de migrar.
10. Documentar cómo restaurar la copia.

### 6.3. Migración de reconciliación

**Prerrequisito comprobado:** `schema.prisma` todavía no contiene `Servicio.modoAsientos`, `LineaPedido.mesaId` ni `LineaPedido.notas`. Hay que añadirlos al esquema antes de generar la migración. No se puede generar una migración completa solo con el esquema actual.

Una sola migración aditiva debe incluir:

- `Mesa.layoutOrder`.
- `Producto.categoria` obligatoria y sin valor por defecto.
- `Servicio` con `modoAsientos`.
- `ServicioMesa`.
- `LineaPedido` con `mesaId` y `notas`.
- `PromoCodigo`.
- `EventoServicio`.
- Claves foráneas e índices correspondientes.

No incluye:

- `Reserva.servicioId`.
- `Servicio.reservaId`.
- `EventoServicio.actorId`.
- Tablas de caja.
- Posiciones personalizadas de asientos.
- Eliminación de `AsientoComanda`.
- Renombrado de estados.

`PromoCodigo` se crea para no romper el código actual, aunque las promociones estén fuera del MVP. No se amplía esa funcionalidad.

`Servicio.modoAsientos` se incluye desde el principio porque `Servicio` aún no existe en la base local. Añadirlo ahora evita una segunda migración cuando lleguen las mesas unidas.

`Producto.categoria` se añade como columna obligatoria sin valor por defecto. SQLite no permite añadir una columna `NOT NULL` sin valor por defecto mediante `ALTER TABLE`, así que `Producto` se reconstruye. Es seguro porque la tabla tiene 0 filas. `Mesa`, que sí tiene 15 filas, se modifica con `ALTER TABLE ADD COLUMN`.

### 6.4. Migraciones posteriores previstas

| Fase | Cambio | Motivo |
|---|---|---|
| Autenticación | `EventoServicio.actorId` | Auditoría con usuario. |
| Reservas | `Reserva.servicioId` o `Servicio.reservaId` | Enlace reserva → servicio. |
| Reservas | Índices por fecha y hora | Mapa de reservas eficiente. |
| Caja | Movimientos, arqueos y devoluciones | Trazabilidad financiera. |
| Limpieza futura | Retirada de `AsientoComanda` | Solo tras decisión y copia de seguridad. |

### 6.5. Verificación de la migración

- Una base vacía debe migrar desde cero.
- El seed debe ejecutarse dos veces sin duplicar datos.
- Deben existir 15 mesas y los productos del seed.
- `GET /api/sala` debe responder 200.
- Los conteos de mesas deben coincidir antes y después.
- La aplicación debe arrancar con la base migrada.

---

## 7. Fases de implementación

### Fase 0 — Decisiones de producto

**Estado:** completada.

Decisiones aprobadas:

- Modelo Reserva/Servicio/LineaPedido.
- Contrato `/api/sala` y `/api/servicios`.
- MVP con walk-in, merge, layout y búsqueda.
- `mesaId` y `notas` en `LineaPedido`.
- `AsientoComanda` como legado.

**Criterio de salida:** decisiones registradas en la spec.

---

### Fase 0.5 — Reconciliación documental y de datos

**Estado:** completada y aprobada por el usuario el 2026-10-24.

Tareas:

- Actualizar `spec.md`.
- Actualizar `plan.md`.
- Registrar el estado auditado.
- Documentar los dos mapas y el modo de asientos.
- Definir la migración de reconciliación.
- Identificar decisiones pendientes no bloqueantes.
- No tocar código ni base de datos.

**Criterio de salida:** documentos coherentes, modelo canónico aprobado y estrategia de migración revisada.

---

### Fase 1 — Entorno, salud, errores y contrato

**Estado:** completada y verificada automáticamente el 2026-10-24.

Objetivo: dejar una base técnica fiable antes de añadir lógica.

Tareas:

- Revisar scripts de desarrollo, compilación y pruebas.
- TypeScript estricto.
- `GET /health`.
- Manejo centralizado de errores con formato `{ code, message, details? }`.
- Validación de entrada.
- Límite de tamaño de petición.
- CORS configurable.
- Logging estructurado con identificador de petición.
- Pruebas básicas de salud y errores.

**Criterio de salida:** el servidor arranca, falla claramente ante configuración inválida y responde con errores coherentes.

---

### Fase 1.5 — Identidad visual

**Estado:** completada y verificada el 2026-10-24.

Objetivo: aplicar el sistema visual antes de rehacer el salón.

Tareas:

- Fondo `#0D0D0D`.
- Tarjetas `#1E1E1E`.
- Acento `#A3E635`.
- Tokens de texto, bordes y estados.
- Revisión de contraste.
- Foco visible.
- Sustitución del acento crema actual.

**Criterio de salida:** no quedan colores antiguos en los componentes del salón y la interfaz mantiene legibilidad.

---

### Fase 2 — Migración aditiva del esquema

**Estado:** completada y verificada el 2026-10-24. Migración aplicada a `dev.db`, seed ejecutado dos veces sin duplicar datos y salón comprobado con 19 mesas, 12 productos y 3 servicios abiertos.

Objetivo: alinear la base con el código actual y con el modelo canónico.

Tareas:

- Copia de seguridad.
- Migración de reconciliación.
- Backfill de `layoutOrder`.
- Creación de tablas del salón.
- Seed idempotente.
- Verificación en base temporal.
- Prueba de `GET /api/sala`.

**Criterio de salida:** una base nueva migra y se siembra; el salón responde 200; los datos existentes se conservan.

---

### Fase 3 — Autenticación, usuarios y roles

**Estado:** backend implementado el 2026-10-24; activación aplazada para priorizar el salón funcional.

El backend de autenticación existe y pasa las pruebas unitarias, pero no está activo sobre el salón. `GET /api/sala` usa una selección explícita de eventos para seguir funcionando mientras `dev.db` no tenga `actorId`. La migración `20261024141500_autenticacion_base` está probada en copia y pendiente de aplicar.

Implementado:

- Configuración `JWT_SECRET` y `JWT_EXPIRES_IN`.
- Hash y verificación con `bcryptjs`.
- Firma y verificación de JWT.
- `POST /api/auth/login` y `GET /api/auth/me`.
- Middleware `requireAuth` y `requireRole`.
- CRUD de empleados en `/api/usuarios` para Gerente.
- Seed de gerente inicial con credenciales configurables.
- `actorId` propagado a los eventos del salón.

Pendiente:

- Aplicar la migración a `dev.db`.
- Proteger las rutas del salón con `requireAuth`.
- Limitar el layout a Encargado y Gerente.
- Pruebas de integración con base real.
- Interfaz de login y sesión.

Decisiones de diseño:

- Hash con `bcryptjs` y coste 12; el campo pasa a llamarse `passwordHash`.
- JWT con `jsonwebtoken`, algoritmo `HS256`, expiración de 8 horas y payload mínimo con `sub`.
- El rol se carga desde la base en cada petición; no se confía en el token.
- Token en `sessionStorage` del navegador.
- CRUD completo de empleados para Gerente, con protección del último gerente activo.
- `EventoServicio.actorId` opcional con relación a `Usuario`.
- Rate limiting en login mediante middleware en memoria; se documenta su límite en despliegues con varias instancias.

Objetivo: proteger el panel interno y habilitar auditoría.

Tareas:

- Login con email normalizado y hash de contraseña.
- JWT con expiración.
- Middleware de autenticación.
- Autorización por rol.
- Alta inicial de gerente mediante seed controlado.
- Endpoints de empleados para Gerente.
- Añadir `actorId` a eventos.
- Pruebas de 401, 403 y usuario inactivo.

**Criterio de salida:** todas las rutas internas exigen token y respetan la matriz de permisos.

---

### Fase 4 — Salón y mesas: backend

Objetivo: estabilizar el contrato del salón y las operaciones de ocupación.

Tareas:

- `GET /api/sala` estable.
- Exponer `Servicio.modoAsientos` en el salón; la base ya lo guarda, pero la serialización actual no lo devuelve.
- CRUD de mesas para Gerente.
- Walk-in.
- Unión de mesas.
- Unir sin líneas conserva `POR_ASIENTO`.
- Unir con líneas pasa a `GENERAL`, generaliza y audita.
- Reordenación de layout.
- Prevención de dos servicios abiertos en la misma mesa.
- Rechazo de reducción de `pax` por asiento ocupado.
- Transacciones en ocupación.
- Validación de mesas y servicios.
- Pruebas de concurrencia.

**Criterio de salida:** se puede abrir, unir, reordenar y consultar el salón sin inconsistencias; la unión generaliza solo cuando corresponde y deja auditoría.

---

### Fase 4.5 — Salón visual y asientos

Objetivo: representar el salón como mesa con asientos numerados.

Tareas:

- Mesa cuadrada y rectangular.
- Puntos de barra como taburetes.
- Asientos derivados de capacidad y `pax`.
- Numeración horaria desde arriba.
- Selección de asiento.
- Modo `POR_ASIENTO` con asientos seleccionables.
- Modo `GENERAL` sin selección de asiento y con cuenta compartida.
- Productos compartidos en el centro.
- Etiquetas de mesas unidas.
- Temporizadores.
- Accesibilidad por teclado.
- Identidad visual aplicada.

**Criterio de salida:** una mesa de 4 plazas muestra 4 asientos y se puede pedir para el asiento 2 sin ambigüedad; un servicio generalizado deja de permitir pedir por asiento.

---

### Fase 5 — Carta, líneas y precios

Objetivo: implementar la comanda operativa.

Tareas:

- Gestión de productos para Gerente.
- `categoria` obligatoria al crear o editar un producto.
- Validación de producto activo.
- Precio histórico.
- `mesaId` y `numeroAsiento` en líneas asignadas.
- Líneas compartidas.
- Respeto de `modoAsientos`: en `GENERAL` no se acepta mesa ni asiento.
- Notas.
- Anulación con motivo, actor y fecha.
- Pruebas de asiento inválido, producto inactivo y servicio cerrado.

**Criterio de salida:** las líneas son trazables, el precio no cambia, el modo de asientos se respeta y las anulaciones quedan auditadas.

---

### Fase 5.5 — Búsqueda global

Objetivo: encontrar cualquier producto activo sin depender de la categoría.

Tareas:

- `GET /api/productos?q=...`.
- Búsqueda parcial, insensible a mayúsculas y acentos.
- Solo activos.
- Límite y orden.
- UI global.
- Añadir al asiento seleccionado.
- Pruebas de Cocina/Barra, inactivos y acentos.

**Criterio de salida:** buscar “atun” encuentra “Tartar de atún” y buscar “agua” devuelve un producto de Barra aunque el usuario esté en Cocina.

---

### Fase 6 — Cocina y Barra

Objetivo: separar la preparación por destino.

Tareas:

- Envío idempotente.
- Cambio de `PENDIENTE` a `CALLED`.
- Separación por `destino`.
- Colas de Cocina y Barra.
- Marcado de `READY`.
- Sin datos personales innecesarios.
- Pruebas de reintentos y destinos.

**Criterio de salida:** comida nunca aparece en Barra y bebida nunca aparece en Cocina; un reintento no duplica líneas.

---

### Fase 7 — Reservas y mapa de reservas

Objetivo: incorporar la intención previa, el check-in y la vista de futuro.

Tareas:

- `POST /api/public/reservas`.
- Aceptación de política.
- Estados de reserva.
- Consulta y cancelación interna.
- `GET /api/reservas/mapa`.
- Mapa de reservas por fecha y hora.
- Mesa prevista sin ocupación real.
- Check-in: Reserva → Servicio.
- Enlace `Reserva` ↔ `Servicio`.
- Reglas de no-show pendientes de confirmar.
- Pruebas de solapamiento y transiciones.

**Criterio de salida:** una reserva puede existir sin servicio, aparece en el mapa de reservas sin ocupar la mesa real, se convierte en servicio al hacer check-in y queda en `NO_SHOW` sin crear ocupación.

---

### Fase 8 — Caja

Objetivo: sustituir el cobro directo por trazabilidad financiera.

Tareas:

- Movimientos de pago inmutables.
- Cobros parciales o totales según reglas.
- Devoluciones con motivo e idempotencia.
- Arqueo calculado desde movimientos.
- Cierre de caja.
- Deshabilitar el cobro directo sin movimiento.
- Pruebas de importes, duplicados y permisos.

**Criterio de salida:** cada variación de dinero tiene actor, referencia y movimiento; el arqueo se puede reproducir.

---

### Fase 9 — Contrato, pruebas y endurecimiento

Objetivo: dejar el proyecto defendible como portafolio.

Tareas:

- OpenAPI.
- Pruebas unitarias e integración.
- Pruebas de flujo completo.
- RBAC, validación y transiciones inválidas.
- Pruebas de seguridad funcional.
- Paginación y límites.
- CI con lint, tipos, migraciones y tests.

**Criterio de salida:** contrato documentado, suite reproducible y flujo principal cubierto.

---

### Fase 10 — Despliegue y operación

Tareas:

- Configuración por variables de entorno.
- HTTPS.
- Copias de seguridad y restauración de SQLite.
- Logs y monitorización.
- Runbook de incidencias.
- Prueba de aceptación con personal.

**Criterio de salida:** despliegue reproducible sin secretos en el repositorio.

---

## 8. Matriz de permisos

| Acción | Cliente | Camarero | Encargado | Gerente |
|---|---:|---:|---:|---:|
| Reserva pública | Sí | — | — | — |
| Ver salón | No | Sí | Sí | Sí |
| Walk-in | No | Sí | Sí | Sí |
| Unir mesas | No | Sí | Sí | Sí |
| Layout | No | No | Sí | Sí |
| Buscar productos | No | Sí | Sí | Sí |
| Comandas | No | Sí | Sí | Sí |
| Enviar comandas | No | Sí | Sí | Sí |
| Anular línea | No | Sí, con auditoría | Sí | Sí |
| Gestionar carta | No | No | No | Sí |
| Gestionar empleados | No | No | No | Sí |
| Arqueo | No | No | Sí | Sí |
| Devolución | No | Pendiente | Sí | Sí |

---

## 9. Contratos principales

| Ruta | Responsabilidad | Validaciones clave |
|---|---|---|
| `GET /api/sala` | Estado del salón | Autenticación, datos mínimos, servicio abierto |
| `POST /api/servicios` | Walk-in o mesa nueva | Mesa libre, pax válido, transacción |
| `PATCH /api/servicios/:id/pax` | Actualizar comensales | Servicio abierto, pax positivo, no dejar asientos ocupados fuera de rango |
| `POST /api/servicios/:id/merge` | Unir mesas | Mesas existentes, sin doble servicio, generalización atómica, auditoría |
| `POST /api/servicios/:id/items` | Añadir línea | Producto activo, asiento válido, precio histórico |
| `POST /api/servicios/:id/call` | Enviar comanda | Líneas pendientes, idempotencia, destinos |
| `POST /api/lineas/:id/ready` | Marcar lista | Estado `CALLED` |
| `POST /api/lineas/:id/anular` | Anular línea | Motivo, actor, estado no pagado |
| `PATCH /api/mesas/layout` | Reordenar | Mesas existentes, transacción |
| `GET /api/productos?q=` | Buscar carta | Solo activos, mínimo 2 caracteres |

Las rutas de reservas y caja se documentarán en sus fases.

---

## 10. Plan de pruebas mínimo

### Migración y datos

- Migrar desde cero en una base temporal.
- Ejecutar el seed dos veces.
- Verificar 15 mesas y productos del seed.
- Verificar que `GET /api/sala` responde 200.

### Salón

- Consultar mesas de las tres zonas.
- Abrir walk-in.
- Evitar dos servicios abiertos en la misma mesa.
- Unir mesas y comprobar etiquetas.
- Reordenar layout.
- Comprobar que una mesa liberada deja de aparecer ocupada.

### Mesas unidas y modo de asientos

- Unir mesas sin líneas mantiene `POR_ASIENTO`.
- Unir mesas con líneas activas deja el servicio en `GENERAL`.
- Todas las líneas activas quedan compartidas tras generalizar.
- Cada línea generalizada genera un evento con su mesa y asiento anteriores.
- Las líneas anuladas no se modifican.
- La operación es atómica: si falla, no cambia nada.
- En modo `GENERAL` no se acepta una línea con asiento.
- Reducir `pax` por debajo del mayor asiento ocupado devuelve 400 y no cambia el servicio.
- Reducir `pax` ignorando líneas anuladas funciona.
- Aumentar `pax` funciona dentro del máximo operativo.

### Reservas y dos mapas

- Crear una reserva y comprobar que aparece en el mapa de reservas.
- Comprobar que la reserva no ocupa la mesa en el mapa real.
- Hacer check-in y comprobar que se crea el servicio.
- Comprobar que la mesa pasa al mapa real y deja de mostrarse como expectativa.
- Marcar no-show y comprobar que no se crea servicio.
- Cancelar la reserva y comprobar que la mesa sigue libre.
- Intentar dos servicios para la misma reserva → error.
- Intentar dos reservas para el mismo servicio → error.

### Asientos y comandas

- Asignar producto al asiento 2 de una mesa de 4.
- Rechazar asiento 0, negativo o mayor que `pax`.
- Crear línea compartida.
- Comprobar precio histórico.
- Anular con y sin motivo.
- Comprobar que no se borra la línea.

### Búsqueda

- Buscar con mayúsculas y minúsculas.
- Buscar sin acentos.
- Buscar productos de Cocina y Barra.
- Excluir inactivos.
- Añadir desde búsqueda al asiento seleccionado.

### Seguridad

- `GET /api/sala` sin token → 401.
- Acción no permitida para el rol → 403.
- Usuario inactivo → 401.
- Token expirado → 401.
- Error de validación → 400, no 500.

### Cocina y Barra

- Comida solo en Cocina.
- Bebida solo en Barra.
- Reintento de envío sin duplicados.
- Transición inválida de estado → 409.

### Caja

- Cobro con movimiento.
- Devolución superior al cobro → 400/409.
- Devolución duplicada → 409.
- Arqueo reproducible desde movimientos.

---

## 11. Decisiones pendientes y comprobaciones técnicas

### 11.1. Decisiones que requieren confirmación del usuario

No bloquean la reconciliación actual:

1. Renombrar o no los estados persistidos al español.
2. Reglas de reserva: duración, franjas, asignación y tolerancia.
3. No-show: solo política o cobro real.
4. Reglas de caja: medios de pago, pagos parciales y redondeo.
5. Permiso exacto para devoluciones.
6. Pedidos anticipados desde reserva.
7. Unicidad global o por zona/clase del número de mesa.
8. Mantener o retirar `PromoCodigo`.
9. Alias `/api/mesas/salon`.
10. Multi-restaurante.
11. Revocación y rotación de JWT.
12. Tema claro y detalles de accesibilidad.

### 11.2. Comprobaciones que se resuelven por inspección técnica

Estas no requieren una decisión de producto:

- Inventario real de tablas, columnas y filas de `dev.db`.
- Diferencia exacta entre `schema.prisma` y las migraciones.
- Viabilidad de aplicar la migración desde cero en una base temporal.
- Estado de compilación del backend y del frontend.
- Comportamiento real de las rutas y códigos HTTP.
- Uso real de los tokens visuales antiguos en CSS y componentes.
- Idempotencia del seed.
- Integridad de claves foráneas y datos huérfanos.
- Volumen de productos y necesidad de índice para la búsqueda.
- Dependencias de autenticación disponibles.
- Cobertura actual de pruebas.
- Existencia de un contrato OpenAPI.

---

## 12. Registro de decisiones

### ADR-001 — Reserva, Servicio y LineaPedido

**Estado:** aceptada.

- Reserva = intención previa.
- Servicio = ocupación real.
- LineaPedido = comanda operativa.
- AsientoComanda = legado.

### ADR-002 — Contrato de API del salón

**Estado:** aceptada.

- `/api/sala` y `/api/servicios` son canónicas en el MVP.
- Las rutas de reservas se aplazan.
- Se podrá añadir un alias si hay compatibilidad externa.

### ADR-003 — Alcance del MVP

**Estado:** aceptada.

- Incluye walk-in, unión de mesas, layout y búsqueda.
- Aplaza promociones, split y cobro directo.

### ADR-004 — Identidad visual

**Estado:** aceptada.

- Fondo `#0D0D0D`.
- Tarjetas `#1E1E1E`.
- Acento `#A3E635`.
- Estados con color y texto.

### ADR-005 — Búsqueda global

**Estado:** aceptada.

- Busca todos los productos activos.
- No depende de la categoría visible.
- Insensible a mayúsculas y acentos.

### ADR-006 — Dos mapas del mismo restaurante

**Estado:** aceptada.

- Mapa de reservas = futuro; no crea ocupación.
- Mapa real = presente; solo muestra servicios abiertos.
- Ambos comparten `Mesa`, `Reserva` y `Servicio`.
- El check-in es la única operación que convierte reserva en servicio.
- El no-show no crea servicio.
- El mapa de reservas es una vista, no una segunda base de datos.

### ADR-007 — Generalización de líneas al unir mesas

**Estado:** aceptada.

- Unir sin líneas mantiene `POR_ASIENTO`.
- Unir con líneas pasa a `GENERAL`.
- Las líneas activas se generalizan y pierden mesa y asiento.
- El origen se conserva en `EventoServicio`.
- La generalización es atómica e irreversible dentro del servicio.
- Reducir `pax` por debajo de un asiento ocupado se rechaza.

### ADR-008 — Autenticación y autorización

**Estado:** aceptada.

- Contraseñas con `bcryptjs`, coste 12, guardadas en `passwordHash`.
- JWT firmado con `jsonwebtoken` y `HS256`; secreto de configuración de al menos 32 caracteres.
- Expiración por defecto de 8 horas y payload mínimo con `sub`.
- El rol se lee de la base en cada petición, no del token.
- Usuario inactivo equivale a no autenticado.
- 401 para falta de identidad; 403 para rol insuficiente.
- Token en `sessionStorage`; el cierre de pestaña elimina la sesión.
- CRUD de empleados solo para Gerente.
- No se puede desactivar ni degradar al último gerente activo.
- Los eventos nuevos guardan `actorId`; los antiguos quedan con `actorId` nulo.

### ADR-009 — Interfaz de comandas y colas de producción

**Estado:** aceptada.

- El selector de productos ya no es un desplegable único: la carta se navega con dos pantallas, Comidas y Bebidas, cada una agrupada por categoría.
- Al seleccionar una mesa se abre una pantalla de comanda completa, no un panel lateral.
- Al tocar un producto se añade al asiento activo.
- Las comandas ya enviadas de una mesa se agrupan en un desplegable dentro de la pantalla de comanda.
- Cocina y Barra tienen una vista propia en formato lista.
- Cada fila de producción muestra `Mesa N · Asiento N` (o `Compartido`) de forma explícita.
- Cada cola muestra las líneas `CALLED` y `READY`, ordenadas de más antigua a más reciente.
- Una línea solo aparece en la cola de su `destino`.
- La estación de cada línea se decide por la categoría del producto: las categorías de bebida (`BEBIDA`, `CAFE`, `COPA`, `VINO`, `CERVEZA`, `REFRESCO`, `LICOR`, `ZUMO`) van a Barra y el resto a Cocina. Así una bebida nunca aparece en Cocina aunque su campo `destino` esté mal configurado.
- Las mesas unidas comparten servicio: las colas agrupan por línea, de modo que un plato o bebida no se duplica por aparecer en varias mesas del mismo servicio.
- La vista de producción permite marcar una línea como lista sin abrir la mesa.

### ADR-010 — Nombre, caja y vista por asiento

**Estado:** aceptada.

- El producto pasa a llamarse **ALFRED** en interfaz, documentación y metadatos.
- El cobro no se realiza desde la pantalla de comanda; se traslada a la vista **Caja**.
- La vista Caja agrupa las cuentas abiertas y permite cobrarlas.
- Solo Encargado y Gerente pueden cobrar. El rol real del usuario autenticado sustituye al antiguo selector provisional de Caja; el backend exige token y rol en `POST /api/servicios/:id/pagar`.
- La cuenta de la mesa se presenta como un panel lateral cerrado por defecto y se abre con el botón `Cuenta · total`.
- La pantalla de mesa tiene un único scroll vertical: puede desplazarse desde cualquier columna para consultar el consumo, mientras la carta y las cabeceras permanecen accesibles.
- Al pulsar un asiento del mapa, se muestra su consumo individual: líneas, unidades y total.
- El mapa de asientos permanece visible en la pantalla de comanda mientras se navega por la carta.

### ADR-011 — Acceso por código de empleado y nota inmediata

**Estado:** aceptada.

- El acceso a Caja usa un único campo, **código de empleado**; no se piden usuario ni contraseña.
- Los códigos iniciales son `0` (Gerente), `1` (Responsable/Encargado) y `2` (Camareros). El backend los resuelve contra las cuentas `0@alfred.local`, `1@alfred.local` y `2@alfred.local`, y mantiene el límite de intentos.
- El botón de Caja dice **Cobrar**, no «Iniciar sesión»; al pulsarlo se solicita el código si no hay sesión.
- La pantalla de mesa mantiene el mapa de asientos y el control de pax en una franja fija; solo se desplaza el contenido inferior con lo pedido y la carta.
- Pulsar una mesa o un punto de barra libre abre la comanda en modo borrador. El servicio se crea de forma automática al añadir el primer producto, evitando cuentas vacías por clics accidentales.

---

## 13. Orden recomendado

1. Cerrar Fase 0.5 y revisar los documentos.
2. Fase 1: entorno, salud y errores.
3. Fase 1.5: identidad visual.
4. Fase 2: migración de reconciliación.
5. Fase 3: autenticación y roles.
6. Fase 4: backend del salón.
7. Fase 4.5: salón visual y asientos.
8. Fase 5: carta y comandas.
9. Fase 5.5: búsqueda global.
10. Fase 6: Cocina y Barra.
11. Fase 7: reservas.
12. Fase 8: caja.
13. Fase 9: contrato, pruebas y endurecimiento.
14. Fase 10: despliegue.

No se debe avanzar a una fase si la anterior no tiene criterio de salida verificado.

---

## 14. Definición de terminado de la reconciliación

La Fase 0.5 se considera terminada cuando:

- `spec.md` y `plan.md` reflejan el modelo aprobado.
- No hay contradicciones entre Reserva, Servicio y LineaPedido.
- Los dos mapas están documentados y relacionados con el check-in.
- `Servicio.modoAsientos` y la generalización están especificados.
- La identidad visual está documentada.
- El salón visual y los asientos están especificados.
- La búsqueda global está especificada.
- La estrategia de migración es aditiva y conserva datos.
- Las decisiones pendientes están separadas de las aprobadas.
- El usuario revisa y aprueba los documentos.

Después de eso, el siguiente trabajo será la Fase 1, no la migración directamente.
