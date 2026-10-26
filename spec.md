# Especificación Técnica: ALFRED

**Versión:** 2.1 — Reconciliación SDD con dos mapas  
**Estado:** Modelo canónico aprobado; desarrollo por fases  
**Última actualización:** 2026-10-24

---

## 1. Objetivo del proyecto

ALFRED es una plataforma de gestión de hostelería para restaurantes. Cubre:

- Reservas públicas con aceptación de la política de no-show.
- Gestión visual del salón y de las mesas.
- Comandas asociadas a asientos numerados.
- Separación de comandas entre Cocina y Barra.
- Cobros, devoluciones y arqueo de caja.

El problema principal que resuelve es la pérdida de trazabilidad en mesas grandes: cada plato o bebida debe poder asociarse a una persona y a un asiento concreto, sin depender de notas manuales ni de la memoria del camarero.

La API es la autoridad del sistema. El frontend no decide importes, permisos, disponibilidad ni estados.

---

## 2. Alcance

### 2.1. Alcance del MVP del salón

- Autenticación con JWT y roles.
- Consulta del estado del salón.
- Mesas visuales con zonas y asientos numerados.
- Apertura de walk-in.
- Unión de mesas.
- Reordenación visual del layout.
- Comandas por asiento.
- Búsqueda global de productos activos.
- Envío de comandas a Cocina y Barra.
- Anulación lógica de líneas con motivo y auditoría.

### 2.2. Fases posteriores

- Reservas públicas y check-in de reservas.
- Mapa de reservas como vista del futuro, separado del mapa real.
- Enlace Reserva → Servicio.
- Caja, cobros, devoluciones y arqueo.
- No-show y posible penalización.
- Pedidos anticipados asociados a una reserva.

### 2.3. Fuera de alcance por ahora

- Promociones y códigos de descuento como funcionalidad del MVP.
- Split de cuenta como funcionalidad del MVP.
- Cobro directo desde el salón sin movimiento de caja.
- Pagos en línea y proveedor de pagos.
- Impresión de tickets o comandas.
- Multi-restaurante.
- Aplicación móvil nativa.
- Despliegue automatizado.

Las funcionalidades aplazadas no deben condicionar el modelo de datos principal ni la primera migración.

---

## 3. Stack y arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, TypeScript, dnd-kit |
| Backend | Node.js, Express 5, TypeScript |
| Base de datos | SQLite |
| ORM | Prisma 5.22 |
| Seguridad | JWT y autorización por roles |
| Testing | Pruebas unitarias e integración; framework pendiente de concretar |

Principios:

1. **La API es la autoridad.** Importes, permisos, estados y disponibilidad se validan en servidor.
2. **Autorización por defecto denegada.** Toda ruta interna exige autenticación y permiso.
3. **Estados controlados.** Las transiciones se validan en servidor.
4. **Operaciones sensibles atómicas.** Ocupación, unión de mesas y dinero se validan y persisten en transacción.
5. **Historial en vez de borrado.** No se eliminan registros con impacto operativo o financiero.
6. **Importes exactos.** El dinero se guarda como entero en céntimos.
7. **Datos mínimos.** No se almacenan datos personales innecesarios ni secretos en logs.
8. **Contrato explícito.** Las rutas y los estados se documentan antes de implementarlos.

---

## 4. Identidad visual

### 4.1. Tokens principales

| Token | Valor | Uso |
|---|---|---|
| Fondo principal | `#0D0D0D` | Fondo de la aplicación |
| Superficie de tarjetas | `#1E1E1E` | Mesas, paneles, modales, inspector |
| Acento principal | `#A3E635` | Acciones principales, selección, foco y elementos activos |
| Texto principal | `#F5F5F7` | Texto de alta importancia |
| Texto secundario | `#A1A1AA` | Texto de apoyo, metadatos y ayudas |
| Bordes | `#2E2E2E` | Separadores y contornos |
| Texto sobre acento | `#0D0D0D` | Texto en botones lima |
| Estado correcto | Verde accesible | Mesas libres, líneas listas |
| Estado de aviso | Ámbar accesible | Tiempo elevado, atención requerida |
| Estado de error | Rojo accesible | Anulaciones, errores, mesas con incidencia |

### 4.2. Reglas de uso

- El lima se reserva para acciones principales, selección activa, foco y elementos interactivos clave.
- El lima no debe ser el único indicador de un estado.
- Cada estado debe comunicarse con color y texto o icono.
- Los botones principales usan fondo lima y texto oscuro.
- Las tarjetas usan `#1E1E1E`; el fondo general usa `#0D0D0D`.
- La interfaz es oscura y sin fotografías: se comunica con texto, estado, tiempos y asientos.
- Debe mantenerse contraste suficiente y legibilidad; se recomienda cumplir WCAG AA.
- El foco de teclado debe ser visible y usar el acento.

### 4.3. Estado actual

Los tokens de esta sección ya están aplicados en `web/src/index.css` y en los componentes del salón. El antiguo fondo `#121212` y el acento crema `#F4E7B6` han sido sustituidos.

Los tokens viven en `@theme` de Tailwind, de modo que los componentes usan clases semánticas (`bg-canvas`, `bg-panel`, `text-accent`, `border-line`, etc.) en lugar de colores escritos a mano.

Se añadió un foco visible global con el color de acento y un `outline-offset` de 2 px.

---

## 5. Roles y permisos

### 5.1. Roles

1. **Cliente público:** reserva desde la web y acepta la política de no-show. No accede al salón.
2. **Camarero:** opera el salón, abre walk-ins, toma comandas, envía y anula líneas con auditoría.
3. **Encargado:** mismas funciones que el camarero, más arqueo y devoluciones según las reglas que se aprueben.
4. **Gerente:** administración total: carta, empleados, mesas, layout y cierre de caja.

### 5.2. Matriz inicial de permisos

| Acción | Cliente público | Camarero | Encargado | Gerente |
|---|---:|---:|---:|---:|
| Crear reserva pública | Sí | — | — | — |
| Consultar salón | No | Sí | Sí | Sí |
| Abrir walk-in | No | Sí | Sí | Sí |
| Unir mesas | No | Sí | Sí | Sí |
| Reordenar layout | No | No | Sí | Sí |
| Buscar productos | No | Sí | Sí | Sí |
| Registrar comandas | No | Sí | Sí | Sí |
| Enviar comandas | No | Sí | Sí | Sí |
| Anular línea | No | Sí, con motivo y auditoría | Sí | Sí |
| Gestionar carta | No | No | No | Sí |
| Gestionar empleados | No | No | No | Sí |
| Arqueo de caja | No | No | Sí | Sí |
| Devolución | No | Pendiente de confirmar | Sí | Sí |

Toda ruta interna exige JWT válido y usuario activo. El rol nunca se acepta desde el cliente.

---

## 6. Modelo de dominio canónico

### 6.1. Decisión principal

ALFRED separa dos momentos distintos:

- **Reserva:** intención futura. Puede existir sin mesa, sin servicio y sin comandas.
- **Servicio:** ocupación real del salón. Nace de un walk-in o del check-in de una reserva.

Las comandas siempre pertenecen a un servicio, nunca directamente a una reserva.

Esta decisión evita duplicar la misma comanda en dos entidades y permite que los walk-ins funcionen sin crear reservas artificiales.

Sobre esta separación se construyen **dos mapas del mismo restaurante**:

- **Mapa de reservas:** muestra el futuro (reservas, mesas previstas y clientes esperados).
- **Mapa real:** muestra el presente (mesas ocupadas, servicios abiertos y comandas).

Ambos mapas leen las mismas entidades. No son dos bases de datos ni dos modelos paralelos; son dos vistas del mismo dominio, descritas en la sección 6.6.

### 6.2. Entidades

| Entidad | Campos principales | Notas |
|---|---|---|
| `Usuario` | id, nombre, email único, password hash, rol, activo, createdAt | No se devuelve el hash. |
| `Mesa` | id, numeroMesa, capacidad, tipo, zona, clase, layoutOrder | `tipo`: CUADRADA, RECTANGULAR o TABURETE. `zona`: RESTAURANTE, TERRAZA o BARRA. `clase`: MESA o PUNTO_BARRA. |
| `Reserva` | id, clienteNombre, clienteTelefono, fechaHora, numPersonas, estado, aceptaPolitica, mesaId opcional, createdAt | `servicioId` se añadirá en la fase de reservas. Una reserva puede tener mesa prevista sin ocuparla. |
| `Servicio` | id, estado, pax, origen, modoAsientos, openedAt, closedAt | `origen`: WALK_IN o RESERVA. `modoAsientos`: POR_ASIENTO o GENERAL. `reservaId` se añadirá en la fase de reservas. |
| `ServicioMesa` | servicioId, mesaId | Permite que un servicio ocupe varias mesas unidas. |
| `Producto` | id, nombre, precio en céntimos, destino, categoria, activo | `destino`: COCINA o BARRA. `categoria` agrupa la carta y es obligatoria al crear el producto; no tiene valor por defecto. |
| `LineaPedido` | id, servicioId, productoId, cantidad, mesaId opcional, numeroAsiento opcional, esCompartido, estado, precioUnitario, notas opcional, motivoAnulacion, createdAt, calledAt | Única línea de comanda operativa. |
| `EventoServicio` | id, servicioId, tipo, detalle, actorId opcional, createdAt | `actorId` se añadirá cuando exista autenticación. `detalle` guarda la auditoría, incluido el origen de las líneas generalizadas. |
| `AsientoComanda` | Modelo heredado de la especificación inicial | Se conserva sin escrituras nuevas. No es núcleo del salón. |
| `PromoCodigo` | codigo, tipo, valor, activo | Existe en el código actual, pero las promociones están fuera del MVP. |

### 6.3. Relaciones

- Una `Mesa` puede aparecer en muchos `ServicioMesa`.
- Un `Servicio` puede ocupar una o varias mesas.
- Un `Servicio` tiene muchas `LineaPedido`.
- Una `LineaPedido` pertenece a un único `Servicio`.
- Una `LineaPedido` referencia un `Producto`.
- Una `Reserva` puede tener como máximo un `Servicio` asociado cuando el cliente llega.
- Un `Servicio` puede tener como máximo una `Reserva` de origen.
- Una `Reserva` puede apuntar a una `Mesa` prevista sin crear ocupación.
- Un `Usuario` puede generar muchos `EventoServicio` cuando exista `actorId`.

### 6.4. Invariantes

1. Una mesa no puede pertenecer a dos servicios abiertos a la vez.
2. Un servicio abierto debe tener al menos una mesa.
3. Una línea pertenece a un único servicio.
4. Si una línea está asignada a un asiento, `mesaId` y `numeroAsiento` son obligatorios.
5. El número de asiento debe estar entre 1 y el `pax` del servicio.
6. Una línea compartida tiene `mesaId` y `numeroAsiento` nulos.
7. El precio unitario se copia al crear la línea y no cambia después.
8. Una línea anulada no se borra: queda en `ANULADO` con motivo y actor.
9. Un servicio no se borra: termina en `PAGADA` o `CANCELADA`.
10. Una reserva no se borra: termina en `CANCELADA`, `NO_SHOW` o `FINALIZADA`.
11. El número de mesa es único dentro de su zona y clase.
12. Las operaciones que afectan a ocupación o dinero se ejecutan en transacción.
13. Si `Servicio.modoAsientos = GENERAL`, todas sus líneas activas tienen `mesaId` y `numeroAsiento` nulos.
14. Si `Servicio.modoAsientos = POR_ASIENTO`, se admiten líneas por asiento y líneas compartidas.
15. El paso de `POR_ASIENTO` a `GENERAL` es irreversible dentro del servicio.
16. No se puede reducir `pax` por debajo del mayor `numeroAsiento` ocupado por una línea activa.
17. Al generalizar líneas se registra en `EventoServicio` el origen de cada una: mesa y asiento anteriores.
18. Una reserva no ocupa una mesa en el mapa real hasta que se realiza el check-in.

### 6.5. Modelo heredado y compatibilidad

`AsientoComanda` fue el modelo inicial para asociar productos a asientos de una reserva. Queda como legado:

- No se escriben filas nuevas en `AsientoComanda`.
- No se elimina en la migración de reconciliación.
- No se usa para pedidos anticipados sin una decisión de diseño específica.
- Su retirada, si se decide, será una migración posterior con copia de seguridad.

`PromoCodigo` se conserva por compatibilidad con el código actual, pero las promociones no forman parte del MVP ni de los criterios de aceptación del salón.

### 6.6. Mapa de reservas y mapa real

ALFRED representa el restaurante en dos pantallas complementarias que comparten el mismo modelo de datos.

#### Mapa de reservas (futuro)

- Muestra reservas por fecha y hora.
- Muestra las mesas previstas para cada reserva.
- Permite consultar qué clientes se esperan y en qué franja.
- No crea ocupación: una mesa reservada para las 21:00 sigue libre en el mapa real.
- Sus estados son los de `Reserva`: `PENDIENTE`, `CONFIRMADA`, `EN_MESA`, `FINALIZADA`, `NO_SHOW` y `CANCELADA`.

#### Mapa real (presente)

- Muestra las mesas ocupadas por servicios abiertos.
- Muestra `pax`, asientos, comandas y estados de preparación.
- Solo aparece ocupación cuando existe un `Servicio` en estado `ABIERTA`.
- Su origen puede ser un walk-in o el check-in de una reserva.

#### Relación entre mapas

1. Se crea una `Reserva` con fecha, hora, número de comensales y, opcionalmente, una mesa prevista.
2. La reserva aparece en el mapa de reservas.
3. La mesa prevista no aparece ocupada en el mapa real.
4. Cuando el cliente llega, el personal ejecuta el check-in.
5. La reserva pasa a `EN_MESA`.
6. Se crea un `Servicio` con `origen = RESERVA`, vinculado a la reserva y a la mesa.
7. El servicio aparece en el mapa real y desaparece la expectativa del mapa de reservas para esa franja.
8. Las comandas se crean sobre el servicio.

#### No-show y cancelación

- Un `NO_SHOW` o una `CANCELADA` liberan la reserva.
- No crean `Servicio`.
- No modifican el mapa real.
- La mesa vuelve a estar disponible para esa franja.

#### Reglas de coherencia

- Un mismo `Servicio` no puede estar asociado a dos reservas.
- Una reserva no puede tener dos servicios.
- El check-in es la única operación que convierte una reserva en ocupación real.
- El mapa de reservas puede mostrar reservas sin mesa asignada mientras no se haya decidido la asignación.
- Un cambio de mesa antes del check-in se hace sobre la reserva, no sobre un servicio inexistente.

#### Pendiente de definir antes de implementar reservas

- Duración estimada de una reserva.
- Franjas horarias y tolerancia de llegada.
- Reglas de solapamiento y doble reserva.
- Asignación automática o manual de mesa.

---

## 7. Estados y transiciones

### 7.1. Reserva

| Estado | Significado |
|---|---|
| PENDIENTE | Creada, pendiente de confirmación. |
| CONFIRMADA | Aceptada por el restaurante. |
| EN_MESA | El cliente ha llegado y se ha sentado. |
| FINALIZADA | El servicio asociado se ha cerrado. |
| NO_SHOW | El cliente no llegó. |
| CANCELADA | Cancelada antes de la llegada. |

Transiciones:

- PENDIENTE → CONFIRMADA
- PENDIENTE o CONFIRMADA → CANCELADA
- CONFIRMADA → EN_MESA
- CONFIRMADA → NO_SHOW
- EN_MESA → FINALIZADA

`EN_MESA` es el punto en el que se crea o vincula el `Servicio`.

### 7.2. Servicio

| Estado | Significado |
|---|---|
| ABIERTA | Ocupación activa. |
| PAGADA | Servicio cerrado con cobro registrado. |
| CANCELADA | Servicio cerrado sin cobro. |

Transiciones:

- ABIERTA → PAGADA
- ABIERTA → CANCELADA

`PAGADA` y `CANCELADA` son terminales.

### 7.3. Línea de pedido

| Estado de dominio | Valor persistido actual | Significado |
|---|---|---|
| PENDIENTE | PENDIENTE | Añadida, aún no enviada. |
| ENVIADO | CALLED | Enviada a Cocina o Barra. |
| SERVIDO | READY | Preparada o servida. |
| PAGADO | PAID | Cobrada. |
| ANULADO | ANULADO | Anulada con motivo. |

Transiciones:

- PENDIENTE → CALLED
- CALLED → READY
- READY → PAID
- Cualquier estado no pagado → ANULADO

`PAID` y `ANULADO` son terminales.

La spec usa nombres de dominio en español y conserva los valores persistidos actuales para evitar una migración innecesaria. Cualquier renombrado futuro requerirá una decisión específica.

---

## 8. Salón visual y asientos

### 8.1. Representación

El salón se organiza por zonas:

- Comedor (`RESTAURANTE`).
- Terraza (`TERRAZA`).
- Barra (`BARRA`).

Dentro de la barra se distinguen:

- Mesas de barra (`clase = MESA`).
- Puntos de barra (`clase = PUNTO_BARRA`, `tipo = TABURETE`).

Cada mesa muestra:

- Etiqueta: número, `T` para terraza, `B` para barra o `Barra N` para puntos de barra.
- Zona.
- Capacidad.
- Ocupación actual (`pax`).
- Estado: libre, activa, ampliada, con pedido pendiente o con pedido listo.
- Tiempo transcurrido desde la apertura.
- Asientos numerados.
- Indicador de mesa unida.

### 8.2. Asientos

- Los asientos se numeran de 1 a N.
- El número 1 empieza en la parte superior y continúa en sentido horario.
- En una mesa libre se muestran tantos asientos como capacidad, en estado inactivo.
- En una mesa con servicio abierto se muestran los asientos equivalentes al `pax`.
- Si `pax` supera la capacidad, la mesa se marca como “ampliada”.
- Los productos compartidos no pertenecen a un asiento: se muestran en el centro o como “Compartido”.
- En mesas unidas, cada mesa física conserva su numeración. Una línea se identifica como “Mesa 2 · Asiento 3”.
- Al hacer clic en un asiento, este pasa a ser el destino de los siguientes productos.
- Si no hay asiento seleccionado, el producto se añade como compartido o se solicita confirmación.
- Los asientos deben ser accesibles por teclado y tener etiquetas claras.

### 8.3. Mesas unidas

- Un servicio puede ocupar varias mesas mediante `ServicioMesa`.
- La UI muestra una sola tarjeta de servicio con las etiquetas de todas las mesas.
- La unión no elimina el historial de las mesas ni de las líneas.

#### Dos modos de servicio

`Servicio.modoAsientos` determina cómo se tratan las líneas:

| Modo | Cuándo se usa | Líneas |
|---|---|---|
| `POR_ASIENTO` | Mesas unidas antes de pedir, o servicio normal de una mesa. | Pueden ir asignadas a mesa y asiento, o ser compartidas. |
| `GENERAL` | Mesas unidas cuando ya existían bebidas o platos. | Todas son compartidas: `mesaId` y `numeroAsiento` nulos. |

#### Unir mesas sin pedidos

1. El servicio permanece en `POR_ASIENTO`.
2. Cada línea nueva puede asignarse a una mesa concreta y a un asiento.
3. La UI sigue mostrando “Mesa 2 · Asiento 3”.
4. Se puede seguir eligiendo asiento después de la unión.

#### Unir mesas con pedidos

1. El servicio pasa a `GENERAL`.
2. Las líneas existentes se generalizan: `esCompartido = true`, `mesaId = null`, `numeroAsiento = null`.
3. Las líneas nuevas también se crean como compartidas.
4. Antes de generalizar, el servidor registra en `EventoServicio` un evento por línea con su mesa y asiento de origen.
5. La UI muestra la cuenta como una sola lista compartida.
6. El paso a `GENERAL` no se revierte dentro del mismo servicio.

#### Auditoría de la generalización

La pérdida de detalle por asiento se compensa con auditoría. El evento debe incluir, como mínimo:

- Identificador del servicio.
- Tipo de evento: `LINEAS_GENERALIZADAS` o equivalente.
- Identificador de la línea generalizada.
- `mesaId` y `numeroAsiento` anteriores.
- Fecha y, cuando exista autenticación, actor.

La línea no conserva esos datos, pero la historia permite reconstruir qué se pidió en cada mesa.

### 8.4. Contrato de datos del salón

`GET /api/sala` debe devolver, como mínimo:

- Mesas con identidad, etiqueta, zona, clase, tipo, capacidad y orden visual.
- Servicio abierto asociado, si existe.
- `pax`.
- `modoAsientos` del servicio.
- Líneas activas con producto, cantidad, asiento, mesa, estado y precio.
- Indicador de mesas unidas.
- Productos activos y datos auxiliares necesarios para la UI.

Los asientos se derivan de `capacidad` y `pax`. No se almacenan posiciones personalizadas en la primera versión.

### 8.5. Reglas de ocupación y comensales

- `pax` debe ser un entero positivo.
- Si `pax` supera la capacidad de la mesa, la mesa se marca como ampliada.
- No se puede reducir `pax` por debajo del mayor asiento ocupado por una línea activa.
- Si se intenta, el servidor devuelve un error de validación y la interfaz explica qué línea o asiento debe moverse o anularse primero.
- Las líneas anuladas no bloquean la reducción de `pax`.

### 8.6. Criterios de aceptación

- Una mesa de 4 plazas muestra 4 asientos numerados.
- Al seleccionar el asiento 2 y añadir un producto, la línea queda asociada a la mesa y al asiento 2.
- Un producto compartido no tiene asiento y se muestra como compartido.
- Una mesa unida muestra las etiquetas de todas las mesas que la forman.
- Unir mesas sin pedidos mantiene el modo `POR_ASIENTO`.
- Unir mesas con pedidos deja el servicio en `GENERAL`, generaliza las líneas y registra la auditoría.
- Reducir `pax` por debajo de un asiento ocupado se rechaza con un mensaje claro.
- El estado se distingue sin depender exclusivamente del color.
- La vista funciona en comedor, terraza y barra.
- El temporizador de la mesa se actualiza sin recargar toda la página.

---

## 9. Búsqueda global de productos

### 9.1. Comportamiento

- Busca en todos los productos activos de la carta.
- No se limita a la categoría o pestaña visible.
- Busca por nombre con coincidencia parcial.
- Es insensible a mayúsculas y acentos: “atun” encuentra “Tartar de atún”.
- No devuelve productos inactivos.
- Cada resultado muestra nombre, precio, destino y categoría.
- El resultado se puede añadir al asiento seleccionado o como compartido.
- La búsqueda no cambia la categoría ni el destino del producto.

### 9.2. Contrato

Ruta propuesta:

`GET /api/productos?q=...`

Reglas:

- `q` con menos de 2 caracteres devuelve lista vacía.
- Límite de 20 resultados.
- Orden: coincidencia exacta, luego empieza por, luego contiene; después por nombre.
- Solo productos activos.
- Respuesta estable con id, nombre, precio, destino y categoría.

La ruta exacta forma parte del contrato y no debe cambiarse sin actualizar esta especificación.

### 9.3. Interfaz

- Campo de búsqueda global visible en el salón o en el inspector.
- Resultados en lista plana con etiqueta de destino.
- Navegación con teclado y cierre con Escape.
- Al elegir un resultado, se añade al asiento activo.
- Si no hay servicio abierto, la acción de añadir está deshabilitada.

### 9.4. Criterios de aceptación

- Buscar “atun” encuentra “Tartar de atún”.
- Buscar “agua” devuelve un producto de Barra aunque el usuario esté viendo Cocina.
- Un producto inactivo no aparece.
- Añadir desde la búsqueda respeta el asiento seleccionado.
- La búsqueda no requiere cambiar de categoría.

---

## 10. Contrato de API

### 10.1. Convenciones

- Prefijo: `/api`.
- Formato: JSON.
- Errores: `{ code, message, details? }`, sin secretos.
- Códigos: 200, 201, 400, 401, 403, 404, 409, 422, 500.
- Autenticación: `Authorization: Bearer <token>` en rutas internas.
- El servidor calcula importes, permisos, estados y disponibilidad.

### 10.2. Rutas canónicas del MVP

| Método | Ruta | Función |
|---|---|---|
| GET | `/health` | Comprobar que el proceso responde. |
| GET | `/api/sala` | Estado del salón, mesas, servicios y productos. |
| POST | `/api/servicios` | Abrir un walk-in o crear mesa y servicio. |
| PATCH | `/api/servicios/:id/pax` | Actualizar comensales. |
| POST | `/api/servicios/:id/merge` | Unir mesas a un servicio. |
| POST | `/api/servicios/:id/cancel` | Cancelar un servicio abierto. |
| POST | `/api/servicios/:id/items` | Añadir una línea de comanda. |
| POST | `/api/servicios/:id/call` | Enviar líneas pendientes a Cocina/Barra. |
| POST | `/api/lineas/:id/ready` | Marcar una línea como lista. |
| POST | `/api/lineas/:id/anular` | Anular una línea con motivo. |
| PATCH | `/api/mesas/layout` | Reordenar mesas. |
| GET | `/api/productos?q=...` | Buscar productos activos. |

### 10.3. Rutas futuras

| Método | Ruta | Fase |
|---|---|---|
| POST | `/api/public/reservas` | Reservas. |
| GET | `/api/reservas` | Reservas. |
| GET | `/api/reservas/mapa` | Mapa de reservas por fecha y hora. |
| POST | `/api/reservas/:id/check-in` | Reservas. |
| POST | `/api/caja/arqueo` | Caja. |
| PATCH | `/api/caja/devolucion` | Caja. |

### 10.4. Compatibilidad con la especificación inicial

La versión inicial proponía `GET /api/mesas/salon` y rutas de comanda sobre `/api/reservas/:id/...`. El contrato operativo aprobado usa `/api/sala` y `/api/servicios/...` porque representa mejor la ocupación real y evita acoplar las comandas a reservas que aún no han llegado.

Si en el futuro se necesita compatibilidad externa, se podrá añadir un alias sin cambiar la base de datos ni duplicar la lógica.

### 10.5. Cobro

La ruta actual `POST /api/servicios/:id/pagar` no se considera cierre de caja. Hasta que exista el módulo de caja:

- No debe marcar un servicio como pagado sin trazabilidad financiera.
- No debe crear datos financieros falsos.
- Puede ocultarse o deshabilitarse en la interfaz.
- Su redefinición se hará en la fase de caja con movimientos inmutables.

---

## 11. Reglas de operación

### 11.1. Comandas

- Solo se añaden líneas a servicios en estado `ABIERTA`.
- El producto debe estar activo.
- El precio unitario se copia del producto en el momento de crear la línea.
- Si la línea está asignada a un asiento, `mesaId` y `numeroAsiento` son obligatorios.
- El asiento debe estar entre 1 y el `pax`.
- Las líneas compartidas tienen asiento y mesa nulos.
- En modo `GENERAL`, toda línea nueva se crea como compartida.
- La anulación exige motivo, actor y fecha.
- Las líneas anuladas no se borran.

### 11.1.1. Unión de mesas y generalización

- Unir mesas sin líneas activas mantiene `modoAsientos = POR_ASIENTO`.
- Unir mesas con líneas activas cambia el servicio a `GENERAL`.
- La generalización afecta a todas las líneas activas del servicio.
- Cada línea generalizada genera un evento de auditoría con su mesa y asiento anteriores.
- La operación se ejecuta en una única transacción: o se generaliza todo, o no se cambia nada.
- La unión no modifica líneas anuladas ni su historial.
- Generalizar no cambia cantidades, precios ni estados de las líneas.

### 11.1.2. Cambio de comensales

- `pax` debe ser un entero positivo y no puede superar un máximo operativo definido por configuración.
- Reducir `pax` exige que ningún asiento ocupado quede fuera de rango.
- Si hay conflicto, la operación se rechaza y no se modifica nada.
- Aumentar `pax` siempre está permitido dentro del máximo operativo.
- El cambio de `pax` no reasigna líneas automáticamente.

### 11.2. Envío a Cocina y Barra

- El envío cambia líneas `PENDIENTE` a `CALLED`.
- Solo se envían líneas del servicio solicitado.
- La operación debe ser idempotente: un reintento no debe duplicar líneas ni eventos.
- Cocina recibe solo productos con destino `COCINA`.
- Barra recibe solo productos con destino `BARRA`.
- Los productos compartidos se muestran como tales, sin asiento.
- Las colas no deben exponer datos personales innecesarios.

### 11.3. Caja

- Cada variación de dinero debe tener importe, método, tipo, actor y referencia.
- El estado pagado se deriva de movimientos válidos o de una proyección consistente.
- No se permite una devolución superior al cobro original.
- Las devoluciones requieren motivo e idempotencia.
- El arqueo calcula el efectivo esperado desde movimientos, no desde totales del navegador.
- Los cierres no se modifican: se corrigen con ajustes auditados.

### 11.4. Seguridad

- JWT firmado con secreto de configuración y expiración limitada.
- Middleware de autenticación que valide firma, expiración y usuario activo.
- Autorización centralizada por rol.
- Validación de entrada en todas las rutas.
- Límite de tamaño de petición.
- CORS restringido por configuración en producción.
- Rate limiting en la ruta pública de reservas.
- No registrar contraseñas, tokens ni datos de pago.
- No confiar en importes, roles ni estados enviados por el cliente.

---

## 12. Criterios de aceptación del salón

- `GET /api/sala` responde 200 con mesas de comedor, terraza y barra.
- Cada mesa muestra estado, capacidad, ocupación y asientos.
- Un walk-in crea un servicio abierto y ocupa una mesa.
- Una mesa no puede tener dos servicios abiertos a la vez.
- Se puede añadir una línea a un asiento concreto.
- Un asiento fuera de rango devuelve 400.
- Un producto inactivo no se puede pedir.
- El precio histórico se conserva aunque cambie la carta.
- La búsqueda global encuentra productos de Cocina y Barra.
- La búsqueda no devuelve productos inactivos.
- Unir mesas conserva las etiquetas y la identidad de cada línea.
- Unir mesas con pedidos deja el servicio en `GENERAL` y audita el origen de cada línea.
- Unir mesas sin pedidos conserva el modo `POR_ASIENTO`.
- Reducir `pax` por debajo de un asiento ocupado devuelve 400 y no modifica el servicio.
- Una reserva confirmada no ocupa la mesa en el mapa real.
- El check-in crea un servicio y lo refleja en el mapa real.
- Un no-show no crea servicio.
- El envío a Cocina/Barra es idempotente y separa destinos.
- Anular una línea exige motivo y deja auditoría.
- Las rutas internas devuelven 401 sin token y 403 sin permiso.
- Los errores de validación devuelven 400, no 500.
- Una base nueva puede migrarse y sembrarse de forma reproducible.

---

## 13. Decisiones pendientes

Estas decisiones no bloquean el modelo canónico aprobado, pero deben resolverse antes de las fases correspondientes:

1. Si los estados persistidos se renombran al español o se mantiene el mapeo actual.
2. Reglas exactas de reserva: duración, franjas, asignación automática y tolerancia.
3. Si el no-show implica solo aceptación de política o un cobro real.
4. Reglas de caja: medios de pago, pagos parciales, propinas y redondeo.
5. Si el camarero puede ejecutar devoluciones o solo solicitarlas.
6. Si habrá pedidos anticipados desde una reserva.
7. Si el número de mesa debe ser único globalmente o por zona/clase.
8. Si se mantiene la tabla `PromoCodigo` o se retira junto con la funcionalidad de promociones.
9. Si se añadirá un alias `/api/mesas/salon` para compatibilidad.
10. Si el proyecto será de un solo restaurante o multi-local.
11. Estrategia de revocación y rotación de JWT.
12. Detalles de accesibilidad y posible tema claro.

---

## 14. Glosario

- **Reserva:** intención futura de ocupar una mesa.
- **Servicio:** ocupación real de una o varias mesas.
- **Mapa de reservas:** vista del futuro; muestra reservas y mesas previstas sin crear ocupación.
- **Mapa real:** vista del presente; muestra servicios abiertos y comandas.
- **Check-in:** operación que convierte una reserva en un servicio real.
- **Modo de asientos:** forma de tratar las líneas de un servicio. `POR_ASIENTO` permite asignar mesa y asiento; `GENERAL` obliga a que todas las líneas sean compartidas.
- **Generalización:** conversión de las líneas por asiento en líneas compartidas al unir mesas con pedidos.
- **Walk-in:** cliente que llega sin reserva.
- **Línea de pedido:** producto con cantidad, asiento, precio histórico y estado.
- **Asiento:** posición numerada dentro de una mesa o servicio.
- **Mesa unida:** varias mesas físicas operadas como un solo servicio.
- **Destino:** área que prepara un producto: Cocina o Barra.
- **Categoría:** agrupación de carta: entrante, principal, postre, bebida, etc.
- **No-show:** reserva incumplida sin cancelación ni aviso.
