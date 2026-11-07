# ALFRED — Teoría y historia del proyecto

Documento para aprender. Explica **qué se construyó**, **por qué** y **qué conceptos de ingeniería de software** hay detrás. No es un manual de instalación ni una lista de comandos: es la teoría del proyecto.

> Estado: primer borrador funcional. Salón, comandas, Cocina, Barra, Caja, acceso por código de empleado, copias de seguridad y repositorio git.

---

## 1. Qué es ALFRED

ALFRED es una aplicación de gestión para hostelería centrada en el **salón**:

- Ver el estado de las mesas.
- Abrir servicios (walk-in), unir mesas y reorganizarlas.
- Tomar comanda por asiento o compartida.
- Enviar comandas a Cocina y Barra.
- Marcar platos como listos.
- Cobrar desde Caja, con permisos por rol.
- Consultar el consumo individual de cada asiento.

El objetivo del primer borrador no era tener un producto comercial completo, sino **validar el flujo operativo real** de un restaurante: ocupar mesa → pedir → producir → cobrar → liberar mesa.

---

## 2. Arquitectura general

El proyecto es un **monorepo sencillo** con dos aplicaciones y una base de datos:

```text
portfolio 2/
├── src/            Backend Express + TypeScript
├── web/            Frontend React + Vite + Tailwind
├── prisma/         Esquema, migraciones y seed
├── tests/          Pruebas automatizadas del backend
├── scripts/        Utilidades: pruebas aisladas y primer administrador
├── plan.md         Plan y decisiones (ADRs)
├── spec.md         Especificación funcional
└── docs/           Documentación teórica
```

### Backend

- **Node.js + TypeScript + Express 5**.
- **Prisma** como ORM.
- **PostgreSQL** como base de datos (conexión en `DATABASE_URL`).
- **Zod** para validar entradas.
- **JWT** para sesiones y **bcryptjs** para hashing de contraseñas.
- Respuestas JSON y errores con formato canónico.

### Frontend

- **React + Vite + TypeScript**.
- **Tailwind CSS** para estilos.
- Estado local con `useState`, `useEffect` y `useMemo`.
- Comunicación con el backend mediante `fetch`.
- Interfaz oscura: fondo `#0D0D0D`, paneles `#1E1E1E`, acento lima `#A3E635`.

### Por qué esta arquitectura

Es una arquitectura **cliente-servidor** clásica:

1. El navegador pinta la interfaz.
2. El frontend pide datos o envía acciones por HTTP.
3. El backend valida, aplica reglas de negocio y escribe en la base de datos.
4. El backend devuelve el estado actualizado.
5. El frontend vuelve a consultar la sala y repinta.

La ventaja es que las reglas importantes viven en el servidor. Aunque alguien manipule el navegador, no puede saltarse validaciones del backend.

---

## 3. Modelo de dominio

El dominio es la representación conceptual del restaurante. Los modelos principales de Prisma son:

### Mesa

Representa un lugar físico: comedor, terraza, barra o punto de barra. Tiene capacidad, tipo, zona y orden de colocación.

### Reserva

Representa una **intención previa**: un cliente que ha reservado. No implica que esté sentado.

### Servicio

Representa la **ocupación real** de una mesa. Se abre cuando llega el cliente (walk-in o check-in) y se cierra al cobrar o cancelar. Un servicio puede agrupar varias mesas unidas.

La distinción es importante:

- **Reserva** = “esperamos a alguien”.
- **Servicio** = “hay alguien ocupando la mesa ahora”.
- **LíneaPedido** = “ese cliente ha pedido este producto”.

### LineaPedido

Es la unidad operativa de la comanda. Guarda:

- Producto, cantidad y precio en el momento de pedir.
- Asiento al que pertenece, o si es compartida.
- Estado: `PENDIENTE`, `CALLED`, `READY`, `PAID`, `ANULADO`.
- Destino productivo: Cocina o Barra.
- Motivo de anulación, fechas y auditoría.

### Producto

Artículo de la carta: nombre, precio, destino y categoría. El precio se guarda en **céntimos** para evitar errores de redondeo con decimales.

### Usuario

Empleado con rol:

- `CAMARERO`: puede operar el salón, pero no cobrar.
- `ENCARGADO`: puede cobrar.
- `GERENTE`: puede cobrar y, en el futuro, gestionar carta, empleados y caja.

### EventoServicio

Registro de auditoría: qué ocurrió en un servicio (pase enviado, línea anulada, cobro, etc.) y, cuando está disponible, qué usuario lo hizo.

### Promo

Descuento aplicable a una cuenta: porcentaje o importe fijo.

---

## 4. Estados y ciclo de vida

### Servicio

- `ABIERTA`: la mesa está ocupada y se puede pedir.
- Cerrado o pagado: la mesa queda libre.

### Línea de pedido

```text
PENDIENTE → CALLED → READY → PAID
     └──────── ANULADO ────────┘
```

- **PENDIENTE**: añadida por el camarero, aún no enviada a producción.
- **CALLED**: enviada a Cocina o Barra; aparece en la cola.
- **READY**: producción la ha marcado como lista.
- **PAID**: cobrada.
- **ANULADO**: retirada con motivo, sin borrar el histórico.

**Teoría:** no se borran líneas. Se cambia su estado. Esto se llama **borrado lógico** y permite auditar qué pasó y calcular totales sin perder información.

---

## 5. Flujo de una petición

Ejemplo: añadir un producto a una mesa.

```text
Inspector.tsx
  → api.addItem(servicioId, input)
  → POST /api/servicios/:id/items
  → Express
  → Zod valida el cuerpo
  → sala.service.addItem()
  → Prisma crea LineaPedido
  → serializeServicio()
  → JSON de respuesta
  → App.tsx refresca /api/sala
  → React repinta la mesa y la comanda
```

### Capas

- **Ruta**: define el endpoint y los permisos.
- **Validación**: comprueba tipos y rangos con Zod.
- **Servicio**: contiene las reglas de negocio.
- **Serialización**: transforma datos de Prisma en JSON estable para el frontend.
- **Frontend**: no calcula reglas críticas; muestra y envía acciones.

**Teoría:** separar rutas, validación, negocio y presentación se llama **separación de responsabilidades**. Hace el código más fácil de probar y de cambiar.

---

## 6. Funciones del salón

### Walk-in

Abre un servicio sin reserva previa. Se elige mesa y número de comensales. Si la mesa no existe, puede crearse.

### Unir mesas

Un servicio puede abarcar varias mesas. Todas las mesas comparten la misma cuenta y las mismas líneas.

**Problema resuelto:** al recorrer la sala, una mesa unida aparece varias veces. En las colas de producción se agrupa por línea para no duplicar platos o bebidas.

### Cambiar pax

Modifica el número de comensales. Si supera la capacidad, la mesa se representa más grande en el mapa.

### Layout

Las mesas se pueden arrastrar para reordenar la sala. El orden se guarda en `layoutOrder`.

### Comanda

La comanda se abre a pantalla completa al seleccionar una mesa. Tiene dos zonas:

- **Consumiciones**: asiento seleccionado, lo pendiente y lo ya enviado.
- **Carta**: productos agrupados por categoría, con pestañas Comidas y Bebidas.

Al pulsar un producto se añade al asiento activo. “Enviar pase” convierte las líneas pendientes en `CALLED`.

### Asientos

El mapa visual permite elegir un asiento. Cada línea puede pertenecer a un asiento o ser compartida. Al seleccionar un asiento se ve su consumo individual: líneas, unidades y total.

### Cuenta

La cuenta está en un panel lateral cerrado por defecto. Se abre con el botón `Cuenta · total`. Ahí se aplican promociones, se elige el modo de reparto y se cancela el servicio.

**Decisión:** el cobro no se hace desde la comanda. Se hace desde Caja, para separar la operación de sala de la operación de cobro.

---

## 7. Cocina y Barra

Son colas de producción en formato lista. Cada fila muestra:

- Tiempo transcurrido con color según urgencia.
- `Mesa N` y `Asiento N` o `Compartido`.
- Cantidad y nombre del producto.
- Estado y botón “Marcar listo”.

### Separación por estación

La estación se decide por la **categoría del producto**:

- Categorías de bebida (`BEBIDA`, `CAFE`, `COPA`, `VINO`, `CERVEZA`, `REFRESCO`, `LICOR`, `ZUMO`) → Barra.
- Resto de categorías (`ENTRANTE`, `PRINCIPAL`, `POSTRE`, etc.) → Cocina.

Así una bebida no aparece en Cocina aunque su campo `destino` esté mal configurado.

**Teoría:** cuando dos datos pueden contradecirse, conviene elegir una **fuente única de verdad**. Aquí la categoría manda sobre el campo `destino`.

---

## 8. Caja y permisos

La vista Caja agrupa las cuentas abiertas: mesas, tiempo, líneas y total. El botón dice **Cobrar**.

El cobro está protegido en dos niveles:

- **Frontend**: solo muestra la acción si el rol puede cobrar.
- **Backend**: exige token y rol `ENCARGADO` o `GERENTE`.

```text
POST /api/servicios/:id/pagar
  requireAuth
  requireRole("ENCARGADO", "GERENTE")
  payServicio(id, actorId)
```

**Teoría:** la seguridad del frontend es solo experiencia de usuario. La seguridad real está en el backend. Nunca hay que confiar en que el cliente “no enviará” una petición.

### Acceso por código

El login de Caja usa un único código de empleado:

- `0` → Gerente.
- `1` → Responsable / Encargado.
- `2` → Camareros.

El backend resuelve el código contra las cuentas `0@alfred.local`, `1@alfred.local` y `2@alfred.local`. Se mantiene un límite de intentos para evitar fuerza bruta.

**Limitación conocida:** un código sin contraseña es cómodo, pero no identifica a cada camarero individualmente. El código `2` es compartido y no permite saber quién hizo cada acción. La evolución natural es un código por empleado y, opcionalmente, un PIN.

---

## 9. Autenticación y sesión

### Registro y contraseñas

Las contraseñas se guardan con **bcrypt**, que aplica un hash lento con sal. Nunca se guarda la contraseña en claro.

### Token JWT

Al iniciar sesión, el backend firma un token con el identificador del usuario. El frontend lo guarda en `sessionStorage`.

Cada petición protegida envía:

```http
Authorization: Bearer <token>
```

El middleware `requireAuth` verifica el token, carga el usuario y lo deja disponible en `request.usuario`.

**Teoría:**

- **Autenticación** = quién eres.
- **Autorización** = qué puedes hacer.
- **JWT** = credencial firmada que el servidor puede verificar sin consultar una sesión en memoria.
- **`sessionStorage`** = se borra al cerrar la pestaña; es más seguro que `localStorage` para sesiones cortas, aunque no protege frente a XSS.

---

## 10. Frontend: componentes y estado

### `App.tsx`

Orquesta la aplicación:

- Carga la sala.
- Guarda la vista activa: Sala, Cocina, Barra o Caja.
- Guarda la mesa seleccionada.
- Gestiona el modo unir mesas.
- Restaura la sesión con `/api/auth/me`.
- Ejecuta acciones y refresca.

### `FloorBoard.tsx` y `TableCard.tsx`

Pintan las zonas y las mesas. `TableCard` muestra estado, tiempo, pax y permite arrastrar.

### `Inspector.tsx`

Es la pantalla de comanda. Contiene:

- Mapa de asientos (`SeatMap`).
- Consumo del asiento.
- Pendientes y enviadas.
- Carta por pestañas.
- Panel lateral de cuenta.

### `KitchenBoard.tsx`

Cola de producción reutilizada para Cocina y Barra, cambiando el destino.

### `CajaBoard.tsx`

Agrupa cuentas abiertas y solicita el cobro.

### `LoginModal.tsx`

Pide el código de empleado.

**Teoría:** React trabaja con **estado**. La interfaz es una función del estado. Cuando cambia el estado, React vuelve a renderizar. Por eso, tras una acción, el patrón es: llamar al backend → refrescar datos → dejar que React repinte.

---

## 11. Dinero y redondeo

Todos los precios se guardan en **céntimos** (enteros). Por ejemplo, `1650` son 16,50 €.

**Teoría:** los números en coma flotante (`0.1 + 0.2`) pueden producir errores. En dinero se usan enteros y se formatea solo al mostrar.

---

## 12. Base de datos y migraciones

Prisma define el esquema en `prisma/schema.prisma`. Cada cambio estructural se guarda como una **migración** en `prisma/migrations`.

Migraciones del proyecto:

1. `init_mesagrid` — modelo inicial.
2. `mesas_zona_y_puntos_barra` — zonas y puntos de barra.
3. `reconciliacion_salon` — ajustes de sala.
4. `autenticacion_base` — renombrado de contraseña y auditoría por usuario.

**Teoría:** una migración es un cambio versionado del esquema. Permite reconstruir la base de datos en cualquier entorno y saber qué cambió y cuándo. Antes de migrar se hace copia de seguridad.

El `seed` (`prisma/seed.ts`) crea datos iniciales: mesas, productos, promociones y empleados. Es **idempotente**: puede ejecutarse varias veces sin duplicar datos.

---

## 13. Pruebas y verificación

Se usaron pruebas con `node:test` para:

- Salud y errores básicos.
- Validación de cuerpos.
- Hash y verificación de contraseñas.
- Firma y manipulación de tokens.

Además, el flujo crítico de cobro se verificó sobre una **copia desechable** de la base de datos:

- Sin token → `401`.
- Como camarero → `403`.
- Como gerente → `200`.

**Teoría:** probar sobre copias evita destruir datos reales. Se distinguen pruebas unitarias (una función), de integración (varias capas) y de extremo a extremo (usuario real).

---

## 14. Copias de seguridad y git

### Copias de la base de datos

`npm run db:deploy` aplica las migraciones y `npm run db:seed` carga datos de demostración (solo fuera de producción). Las copias se hacen con `pg_dump` en local y con las herramientas del proveedor (Neon) en producción.

### Repositorio git

El proyecto está versionado con git. Se ignoran:

- `node_modules`.
- Builds (`dist`).
- La base de datos y sus copias.
- Variables de entorno.

**Teoría:**

- **Git** guarda la historia del código, no los datos.
- La base de datos se protege con copias independientes.
- Un commit es una foto del proyecto en un momento concreto.
- `.gitignore` evita versionar archivos grandes o sensibles.

---

## 15. Decisiones de diseño (ADR)

Un **ADR** (Architecture Decision Record) documenta una decisión y su motivo. En `plan.md` están registradas, entre otras:

- Modelo canónico Reserva / Servicio / LíneaPedido.
- Identidad visual oscura con acento lima.
- Comanda a pantalla completa.
- Carta por pestañas Comidas/Bebidas.
- Cocina y Barra en formato lista.
- Cuenta como panel lateral cerrado.
- Scroll único en la pantalla de mesa.
- Mapa de asientos fijo arriba.
- Acceso por código de empleado.
- Separación de estaciones por categoría.

**Teoría:** las decisiones importantes deben quedar escritas con su contexto. En seis meses, “por qué se hizo así” vale tanto como el código.

---

## 16. Limitaciones actuales

- Solo el cobro está protegido; el resto de acciones no exige sesión.
- El código `2` es compartido por todos los camareros.
- No hay cobro parcial, métodos de pago, propina, ticket ni arqueo.
- No hay gestión de carta ni de empleados desde la interfaz.
- No hay histórico de cuentas cobradas.
- No hay tiempo real: las vistas se actualizan al refrescar o tras una acción.
- No hay PWA ni funcionamiento offline.
- No hay pruebas de extremo a extremo.
- La aplicación depende de que el backend y PostgreSQL estén disponibles.

---

## 17. Próximas fases previstas

1. **Gerencia**: carta, precios, empleados con códigos individuales, histórico y arqueo.
2. **Cobro completo**: efectivo/tarjeta, pagos parciales, cambio, propina y ticket.
3. **Tiempo real y colores**: Cocina/Barra sin refrescar y avisos por tiempo.
4. **Comanda flexible**: modificar cantidades, mover líneas, notas y alergias.
5. **PWA y pruebas**: tolerancia a fallos de red y pruebas de flujos completos.

---

## 18. Glosario

- **API**: interfaz por la que el frontend habla con el backend.
- **Endpoint**: una ruta concreta de la API.
- **Middleware**: función que se ejecuta entre la petición y la ruta (autenticación, logs, errores).
- **ORM**: capa que traduce objetos del código a tablas de la base de datos.
- **Migración**: cambio versionado del esquema.
- **Seed**: datos iniciales de desarrollo.
- **Serializar**: convertir datos internos en JSON para enviarlos.
- **Token**: credencial firmada que identifica una sesión.
- **Rol**: permiso asociado a un tipo de usuario.
- **Borrado lógico**: marcar como anulado en vez de borrar.
- **ADR**: documento que explica una decisión de arquitectura.
- **PWA**: aplicación web que puede cachear y funcionar parcialmente sin red.

---

## 19. Resumen mental del proyecto

Si tuvieras que explicar ALFRED en una frase:

> Es una aplicación cliente-servidor donde React pinta el salón, Express aplica las reglas, Prisma guarda en PostgreSQL y los permisos por rol protegen el cobro. El dominio separa reserva, servicio y línea de pedido; la comanda separa sala y producción; y el dinero se guarda en céntimos para no perder precisión.

Ese es el esqueleto. Todo lo demás son capas sobre esa idea.
