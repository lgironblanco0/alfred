# Recorrido del backend — de una petición HTTP a la base de datos

Documento del Bloque 1.1. Explica el viaje completo de `POST /api/servicios`, que abre una mesa (walk-in).

Léelo con el código abierto al lado. Al final hay un ejercicio de verificación.

---

## 1. El mapa en una imagen

```text
Navegador
  │  fetch POST /api/servicios  { mesaId, pax }
  ▼
Vite (5173)  ──proxy /api──▶  Express (3000)
                                 │
                                 ├─ requestId
                                 ├─ requestLogger
                                 ├─ cors
                                 ├─ express.json
                                 │
                                 ▼
                         salaRouter.post("/servicios")
                                 │
                                 ├─ asyncRoute
                                 ├─ parseInput(walkInBody)   ← Zod
                                 │
                                 ▼
                         sala.createWalkIn()
                                 │
                                 ├─ reglas de negocio
                                 ├─ Prisma
                                 ▼
                            PostgreSQL
                                 │
                                 ▼
                         serializeServicio()
                                 │
                                 ▼
                         201 + JSON
                                 │
                                 ▼
                         React refresca /api/sala
```

---

## 2. Paso 0 — El navegador

En `web/src/api.ts`:

```ts
walkIn: (body) =>
  request<Servicio>("/api/servicios", {
    method: "POST",
    body: JSON.stringify(body),
  }),
```

El frontend no calcula reglas de negocio. Solo envía datos y espera una respuesta.

**Concepto:** el navegador es un cliente. No es confiable: cualquiera puede modificarlo o llamar a la API directamente. Por eso las reglas viven en el servidor.

---

## 3. Paso 1 — Vite como proxy

En desarrollo hay dos servidores:

- Vite en `http://localhost:5173` sirve React.
- Express en `http://localhost:3000` sirve la API.

`web/vite.config.ts` redirige `/api` y `/health` al backend:

```ts
proxy: {
  "/api": "http://localhost:3000",
  "/health": "http://localhost:3000",
}
```

Así el navegador solo habla con el puerto 5173 y evita problemas de CORS en desarrollo.

**Concepto:** un proxy reenvía peticiones de un servidor a otro. En producción, normalmente un reverse proxy (Nginx, Caddy o la plataforma) cumple este papel.

---

## 4. Paso 2 — Express y la cadena de middleware

`src/server.ts` arranca la aplicación:

```ts
const server = app.listen(config.port, ...)
```

`src/app.ts` monta la cadena:

```ts
app.use(requestId);
app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

app.get("/health", ...);
app.use("/api/auth", authRouter);
app.use("/api/usuarios", requireAuth, requireRole("GERENTE"), usuariosRouter);
app.use("/api", salaRouter);

app.use(notFound);
app.use(errorHandler);
```

Cada `app.use` es un eslabón. Express ejecuta en orden hasta que alguien responde o llama a `next(error)`.

### Qué hace cada middleware

| Middleware | Función |
|---|---|
| `requestId` | Genera o valida `X-Request-Id`; sirve para rastrear una petición en los logs |
| `requestLogger` | Mide duración y registra método, ruta y estado al terminar |
| `cors` | Decide qué orígenes pueden llamar a la API |
| `express.json` | Parsea el cuerpo JSON y limita su tamaño a 100 KB |

**Concepto:** middleware es una función entre la petición y la respuesta. Recibe `(req, res, next)` y decide pasar el control o cortar.

---

## 5. Paso 3 — La ruta

`src/routes/sala.ts`:

```ts
salaRouter.post(
  "/servicios",
  asyncRoute(async (request, response) => {
    const input = parseInput(walkInBody, request.body);
    const servicio = await sala.createWalkIn({
      ...input,
      actorId: request.usuario?.id,
    });
    response.status(201).json(serializeServicio(servicio));
  }),
);
```

Como el router se monta en `/api`, la ruta final es `POST /api/servicios`.

### `asyncRoute`

```ts
Promise.resolve(handler(request, response, next)).catch(next);
```

Express 5 maneja mejor las promesas, pero este envoltorio garantiza que cualquier error asíncrono llegue a `next(error)` y no se pierda.

**Concepto:** un error no capturado en una promesa puede tumbar el proceso o dejar la petición colgada. `asyncRoute` centraliza esa captura.

---

## 6. Paso 4 — Validación con Zod

```ts
const walkInBody = z
  .object({
    mesaId: z.number().int().positive().optional(),
    zona: z.enum(["RESTAURANTE", "TERRAZA", "BARRA"]).optional(),
    clase: z.enum(["MESA", "PUNTO_BARRA"]).optional(),
    pax: z.number().int("pax debe ser entero").positive("pax debe ser mayor que cero"),
    createTable: z.boolean().optional(),
  })
  .refine((value) => value.mesaId !== undefined || value.createTable === true, {
    message: "Selecciona una mesa o crea una nueva",
    path: ["mesaId"],
  });
```

`parseInput` hace `safeParse`:

- Si falla, lanza `HttpError(400, "Datos de entrada no válidos", { code: "VALIDATION_ERROR", details })`.
- Si pasa, devuelve datos **transformados** y tipados.

Esto ocurre en el **borde** del sistema: nada entra al servicio sin validar.

**Concepto:** validar en el borde evita que datos basura lleguen a las capas profundas. Es más barato rechazar pronto.

**Matiz importante:** el cuerpo no se coacciona. `pax: "2"` o `pax: true` devuelven `400`, porque JSON ya distingue tipos y aceptarlos en silencio esconde el error del cliente. La coerción queda solo en los parámetros de ruta, que Express entrega siempre como texto. Ver `docs/ERRORES-Y-VALIDACION.md`.

Además, Zod valida forma y tipo, pero no todas las reglas de negocio. Por ejemplo, “el asiento debe estar entre 1 y el pax” es una regla de negocio y hoy no se comprueba.

---

## 7. Paso 5 — El servicio de negocio

`src/sala/service.ts`, función `createWalkIn`:

1. Normaliza `pax` a entero positivo.
2. Si `createTable`, crea una mesa nueva.
3. Exige `mesaId`.
4. Busca la mesa; si no existe, `404`.
5. Comprueba si ya hay un servicio abierto en esa mesa; si lo hay, `409`.
6. Crea el servicio con:
   - `pax`
   - `origen: "WALK_IN"`
   - vínculo a la mesa (`mesas: { create: { mesaId } }`)
   - evento `APERTURA`
7. Devuelve el servicio con sus relaciones.

**Concepto:** la capa de servicio contiene las reglas que no pertenecen ni al HTTP ni a la base de datos. La ruta sabe de métodos y códigos; el servicio sabe de mesas, servicios y ocupación.

### Observación de deuda

`createWalkIn` hace varias escrituras (crear mesa, crear servicio, crear evento) sin una transacción global. Si fallara una parte, podría quedar una mesa huérfana. Se corregirá cuando se revise la integridad en la Fase 1/2.

---

## 8. Paso 6 — Prisma y PostgreSQL

`src/db.ts` crea el cliente:

```ts
export const prisma = new PrismaClient(...)
```

`prisma.servicio.create(...)` se traduce en inserts en:

- `Servicio`
- `ServicioMesa`
- `EventoServicio`

Las relaciones están definidas en `prisma/schema.prisma`.

**Concepto:** un ORM traduce objetos del código a tablas. No elimina la necesidad de entender SQL, pero evita escribir consultas manuales para lo común.

**Concepto:** una transacción agrupa varias operaciones para que se apliquen todas o ninguna. Aquí no se usa en `createWalkIn`.

---

## 9. Paso 7 — Serialización

`serializeServicio` transforma el resultado de Prisma en un JSON estable:

- Calcula `subtotal`, `discount` y `total` en céntimos.
- Convierte fechas a ISO.
- Construye `mesaLabels`.
- Ordena líneas y eventos.
- No expone campos internos innecesarios.

**Concepto:** serializar es decidir qué ve el cliente. No se devuelve el objeto de Prisma tal cual: se construye un contrato explícito.

---

## 10. Paso 8 — Respuesta y refresco

Express responde `201 Created` con el servicio serializado.

El frontend:

```ts
const servicio = await api.walkIn(input);
const next = await refresh();
const mesa = next.mesas.find((item) => servicio.mesaIds.includes(item.id));
if (mesa) setSelectedId(mesa.id);
```

Primero crea, luego vuelve a pedir `GET /api/sala` y repinta. No intenta mantener el estado del salón a mano.

**Concepto:** patrón “mutar y volver a consultar”. Es más simple y menos propenso a inconsistencias que actualizar el estado local pieza por pieza. Tiene un coste: una petición extra.

---

## 11. El camino del error

| Situación | Dónde se detecta | Respuesta |
|---|---|---|
| Falta el token | `requireAuth` | `401 UNAUTHORIZED` |
| JSON mal formado | `express.json` | `400 INVALID_JSON` |
| Cuerpo mayor de 100 KB | `express.json` | `413 PAYLOAD_TOO_LARGE` |
| `pax` ausente o cero | Zod | `400 VALIDATION_ERROR` con `details` |
| Mesa inexistente | Servicio | `404 NOT_FOUND` ("Mesa no encontrada") |
| Mesa ya ocupada | Servicio | `409 CONFLICT` |
| Error inesperado | `errorHandler` | `500 INTERNAL_ERROR` sin detalles internos |

**Concepto:** los errores también son parte del contrato. Un buen backend distingue “el cliente se equivocó” (4xx) de “el servidor falló” (5xx).

---

## 12. Dónde está cada cosa

| Archivo | Responsabilidad |
|---|---|
| `src/server.ts` | Arrancar el servidor y cerrar ordenadamente |
| `src/app.ts` | Montar middleware y routers |
| `src/routes/sala.ts` | Contrato HTTP y validación de forma |
| `src/validation.ts` | Convertir errores de Zod en `HttpError` |
| `src/sala/service.ts` | Reglas de negocio y acceso a datos |
| `src/sala/include.ts` | Qué relaciones cargar de Prisma |
| `src/sala/serialize.ts` | Contrato de salida |
| `src/db.ts` | Cliente Prisma |
| `src/errors.ts` | Error HTTP tipado |
| `src/middleware/errorHandler.ts` | Respuesta canónica de errores |
| `prisma/schema.prisma` | Modelo de datos |

---

## 13. Deuda y avisos que este recorrido deja visibles

1. La ruta exige `requireAuth` desde el Bloque 1.3 y el evento guarda `actorId`; desde 1.4 también las rutas de líneas y reparto lo pasan, y el actor se devuelve en el histórico.
2. `createWalkIn` no es transaccional.
3. Zod valida el tipo del asiento, pero no su rango respecto al pax.
4. El frontend llama a `/api/sala` después de cada mutación; es correcto, pero se puede optimizar más adelante.

Estos puntos no se arreglan en 1.1. Se anotan para las fases correspondientes.

---

## 14. Ejercicio de verificación

Sin mirar el documento, responde:

1. ¿En qué archivo se decide que `POST /api/servicios` existe?
2. ¿Dónde se comprueba que `pax` es un entero positivo?
3. ¿Qué ocurre si la mesa ya tiene un servicio abierto?
4. ¿Qué tres cosas escribe Prisma en la base de datos al abrir un walk-in?
5. ¿Por qué el frontend vuelve a pedir `/api/sala` después de crear el servicio?
6. ¿Qué middleware rellena `request.usuario` y qué ocurre si no está en la ruta?
7. ¿Qué diferencia hay entre un error 400 y un error 500?
8. Dibuja el recorrido desde `fetch` hasta PostgreSQL, con al menos seis pasos.

Si puedes responder sin mirar, el Bloque 1.1 está aprendido. Si no, vuelve al punto correspondiente.
