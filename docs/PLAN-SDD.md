# ALFRED — Plan estricto SDD y formación fullstack

**Objetivo:** convertir el primer borrador en un ejercicio fullstack real, trabajando con Spec-Driven Development (SDD), en bloques pequeños, verificables y explicados.

**Punto de partida:** ALFRED funciona en local (salón, comandas, Cocina, Barra, Caja, códigos 0/1/2, git y copias). La documentación SDD existe, pero la trazabilidad, la seguridad completa, las pruebas automáticas y el despliegue están pendientes.

**Forma de trabajo:** un bloque = una rama = un commit (o varios pequeños). Ningún bloque se da por terminado sin especificación, prueba, verificación y una explicación tuya con tus palabras.

---

## 0. Estado de avance

> Este documento es la fuente de verdad del plan. **No se elimina nada**: solo se añaden marcas de estado, fechas, commits y notas. Cada bloque lleva su propio estado al empezar y al terminar.

### 0.1. Convención de estados

| Marca | Significado |
|---|---|
| ⬜ | Pendiente: no empezado |
| 🟨 | En curso: se está trabajando |
| ✅ | Hecho: cumple la Definition of Done |
| ⛔ | Bloqueado: falta una decisión o un requisito |
| 🔁 | Reabierto: se rompió algo o cambió el alcance |

Al cerrar un bloque se añade una línea así debajo de su título:

```text
Estado: ✅ Hecho · Fecha: AAAA-MM-DD · Commit: abc1234 · Verificación: npm run verify OK
```

### 0.2. Panel de fases

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Fundación SDD y trazabilidad | ✅ Hecho |
| 1 | Backend, seguridad y códigos individuales | 🟨 En curso (1.1–1.4 ✅) |
| 2 | Calidad: pruebas, CI, API y observabilidad | ⬜ Pendiente |
| 3 | Gerencia: carta, empleados, histórico y arqueo | ⬜ Pendiente |
| 4 | Cobro completo | ⬜ Pendiente |
| 5 | Reservas | ⬜ Pendiente |
| 6 | Tiempo real y colores | ⬜ Pendiente |
| 7 | Comanda flexible | ⬜ Pendiente |
| 8 | Stock y 86 | ⬜ Pendiente |
| 9 | PWA y offline | ⬜ Pendiente |
| 10 | Informes | ⬜ Pendiente |
| 11 | Producción y operación | ⬜ Pendiente |

### 0.3. Registro cronológico de avance

> Se añade una entrada por cada bloque trabajado, sin borrar las anteriores. La más reciente va al final.

| Fecha | Bloque | Resultado | Commit | Notas |
|---|---|---|---|---|
| 2026-10-27 | 0.1 Línea base verificable | ✅ Hecho | e5de120 | Versiones alineadas a 0.1.0, README, `.env.example`, clean-room correcto; retiradas dos dependencias nativas sin uso |
| 2026-10-27 | 0.2 Matriz de trazabilidad | ✅ Hecho | 64c8f2e | 163 requisitos clasificados: 10 probados, 61 implementados sin prueba, 24 parciales, 68 pendientes; 7 discrepancias documentadas |
| 2026-10-27 | 0.3 DoD, changelog y plantilla | ✅ Hecho | 34ce9dc | `CHANGELOG.md`, Definition of Done, plantilla de bloque y proceso de cambio de alcance |
| 2026-10-27 | 0.4 Estrategia de pruebas | ✅ Hecho | 91820c9 | Niveles, base desechable, fixtures, cobertura por riesgo y comandos previstos |
| 2026-10-27 | 0.5 Integración continua local | ✅ Hecho | c9baf3e | `npm run verify` en verde; workflow de GitHub Actions preparado para cuando exista remoto |
| 2026-10-27 | 1.1 Recorrido guiado del backend | ✅ Hecho | 0b081ff | `docs/RECORRIDO-BACKEND.md`; verificación oral en 3 intentos. Confusión detectada: mezcla validación de forma (400, ruta) con regla de negocio (409, servicio) |
| 2026-10-27 | 1.2 Validación y errores canónicos | ✅ Hecho | 354e440 | Contrato de error, cuerpos sin coerción, mesa exigida en el borde; 33/33 pruebas |
| 2026-10-27 | 1.3 Proteger rutas de escritura | ✅ Hecho | c75b56c | Matriz de permisos, `requireAuth` en 12 rutas, login obligatorio en frontend; 52/52 pruebas |
| 2026-10-27 | 1.4 Auditoría del actor | ✅ Hecho | Pendiente de commit | Eventos `PEDIDO`, `LISTO` y `SPLIT` con actor; `actor` en la respuesta; historial en la interfaz; 56/56 pruebas |

---

## 1. Reglas del juego

### 1.1. Ciclo de cada bloque

Todo bloque sigue el mismo ciclo:

1. **Especificar:** qué se quiere y por qué.
2. **Criterios de aceptación:** cómo sabremos que está bien.
3. **Prueba primero:** escribir una prueba que falle (si aplica).
4. **Implementar:** el cambio mínimo para que pase.
5. **Verificar:** typecheck, build, tests y prueba manual.
6. **Documentar:** actualizar spec, trazabilidad y ADR si hay decisión.
7. **Explicar:** tú explicas el bloque con tus palabras.
8. **Commit:** mensaje claro y rama fusionada.

### 1.2. Definition of Done (DoD)

Un bloque está terminado cuando:

- [ ] Tiene criterios de aceptación escritos.
- [ ] Tiene al menos una prueba automatizada o una verificación manual documentada.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` y `npm --prefix web run build` pasan.
- [ ] `npm test` pasa.
- [ ] No se han roto flujos existentes.
- [ ] La documentación refleja el cambio.
- [ ] Hay commit en git.
- [ ] Puedes explicar qué hace, por qué y qué alternativas había.

### 1.3. Reglas de seguridad y datos

- Copia de la base antes de cualquier migración: `npm run db:backup`.
- Nunca probar flujos destructivos sobre `dev.db`: usar copia desechable.
- Ninguna ruta que modifique datos queda sin autenticación.
- Los secretos no van al repositorio.
- Los errores no revelan información interna.

### 1.4. Convención de ramas y commits

- Rama: `fase-<n>/<bloque>-<descripcion>`.
- Commit: `tipo(alcance): descripción` (`feat`, `fix`, `test`, `docs`, `chore`, `refactor`).
- Etiqueta al cerrar una fase: `v0.x.0`.

---

## 2. Mapa de fases

```text
Fase 0  Fundación SDD y trazabilidad
Fase 1  Backend, seguridad y códigos individuales
Fase 2  Calidad: pruebas, CI, API y observabilidad
Fase 3  Gerencia: carta, empleados, histórico y arqueo
Fase 4  Cobro completo
Fase 5  Reservas
Fase 6  Tiempo real y colores
Fase 7  Comanda flexible
Fase 8  Stock y 86
Fase 9  PWA y offline
Fase 10 Informes
Fase 11 Producción y operación
```

Duración orientativa a tiempo parcial: **8–12 semanas**. No es una carrera; cada fase se cierra antes de abrir la siguiente.

---

## 3. Fase 0 — Fundación SDD y trazabilidad

**Objetivo:** que el proyecto deje de ser “código con documentos” y pase a ser “documentos que gobiernan el código”.

### Bloque 0.1 - Línea base verificable

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: e5de120 · Verificación: typecheck, builds, 15 tests y clean-room OK

**Teoría:** una línea base es una foto conocida y reproducible del proyecto.

Tareas:
- Verificar que arranca desde cero con las instrucciones actuales.
- Etiquetar el estado actual: `v0.1.0`.
- Comprobar typecheck, builds y tests.
- Revisar que `.gitignore` excluye datos, secretos y builds.

Verificación: alguien distinto puede arrancar el proyecto siguiendo solo la documentación.

### Bloque 0.2 - Matriz de trazabilidad

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: 64c8f2e · Verificación: 163 filas y 0 requisitos sin estado

**Teoría:** trazabilidad es poder responder "¿dónde está implementado y probado este requisito?".

Tareas:
- Extraer los requisitos de `spec.md`.
- Crear una tabla: requisito → criterio de aceptación → archivo → prueba → estado.
- Marcar: implementado, parcial, pendiente.

Verificación: ningún requisito del MVP queda sin estado.

### Bloque 0.3 - DoD, changelog y plantilla de bloque

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: 34ce9dc · Verificación: documentos creados, enlazados en README y sin requisitos sin dueño

Tareas:
- Añadir `CHANGELOG.md`.
- Documentar la DoD y la plantilla de bloque.
- Definir cómo se registra un cambio de alcance.

Verificación: el siguiente bloque se planifica usando la plantilla.

### Bloque 0.4 - Estrategia de pruebas

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: 91820c9 · Verificación: documento con niveles, base desechable, fixtures y prioridades

**Teoría:** pirámide de pruebas: muchas unitarias, algunas de integración, pocas de extremo a extremo.

Tareas:
- Definir qué se prueba en cada nivel.
- Definir cómo se crea una base desechable por ejecución.
- Documentar datos de prueba.

Verificación: existe una decisión escrita y aplicable.

### Bloque 0.5 - Integración continua local

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: c9baf3e · Verificación: `npm run verify` en verde (typecheck, builds y 15/15 tests)

Tareas:
- Script único `npm run verify` que ejecute typecheck, builds y tests.
- Configurar GitHub Actions cuando exista remoto.
- Impedir commits si la verificación falla (hook opcional).

Verificación: `npm run verify` pasa en local y en CI.

**Puerta de fase 0:** ✅ Trazabilidad completa (163 requisitos), DoD y plantilla, estrategia de pruebas y `npm run verify` en verde. La CI se ejecutará cuando exista repositorio remoto.

---

## 4. Fase 1 — Backend, seguridad y códigos individuales

**Objetivo:** entender el backend y cerrar el agujero principal: hoy solo el cobro está protegido.

### Teoría base de backend (leer antes de empezar)

**Petición HTTP:** el navegador envía método + ruta + cabeceras + cuerpo. El servidor responde estado + cabeceras + cuerpo.

**Express:** es una cadena de funciones. Cada middleware recibe `(req, res, next)` y decide: responder o pasar a la siguiente.

**Capas:**

```text
Ruta → validación → permisos → servicio de negocio → Prisma → base de datos
                                                       ↓
                                             serialización → JSON
```

**Preguntas para leer cualquier endpoint:**

1. ¿Quién puede llamarlo?
2. ¿Qué método y ruta tiene?
3. ¿Qué datos recibe y cómo se validan?
4. ¿Qué reglas de negocio aplica?
5. ¿Qué escribe en la base?
6. ¿Qué devuelve y qué errores puede dar?

**Autorización:** no basta con saber quién eres; hay que comprobar qué puedes hacer.

### Bloque 1.1 - Recorrido guiado del backend actual

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: 0b081ff · Verificación: explicación del flujo sin mirar (3 intentos; aprobado con dos preguntas de opción múltiple)

Tareas:
- Leer `src/app.ts`, `src/server.ts`, `src/routes/sala.ts`, `src/sala/service.ts`, `src/middleware/requireAuth.ts`.
- Dibujar el recorrido de una petición real (`POST /api/servicios`).
- Explicar con tus palabras qué hace cada capa.

Verificación: tú dibujas el flujo sin mirar.

Nota de verificación (2026-10-27): se necesitaron tres intentos. La confusión principal fue ubicar la validación de forma en el servicio y confundir el 400 de Zod con el 409 de mesa ocupada. Para el Bloque 1.2 conviene reforzar con pruebas automatizadas que demuestren cada código, no solo con explicación oral.

### Bloque 1.2 — Validación y errores canónicos

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: 354e440 · Verificación: `npm run verify` en verde con 33/33 pruebas

Tareas:
- Revisar Zod y el manejador de errores.
- Añadir pruebas para cuerpos inválidos, identificadores inválidos y errores 404.
- Documentar el formato de error.

Resultado:
- Contrato en `docs/ERRORES-Y-VALIDACION.md` con catálogo de códigos y 13 criterios de aceptación.
- Los cuerpos ya no se coaccionan: `pax: "2"` y `pax: true` devuelven `400 VALIDATION_ERROR`.
- `POST /api/servicios` exige mesa en el borde (`path: "mesaId"`).
- 23 pruebas de API y 10 unitarias del manejador de errores.

Deuda registrada: la prueba de `409` depende de la base de demostración hasta el Bloque 2.1.

Verificación: pruebas en verde y errores uniformes.

### Bloque 1.3 — Proteger todas las rutas de escritura

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: c75b56c · Verificación: `npm run verify` en verde con 52/52 pruebas

**Teoría:** toda ruta que crea, modifica o borra datos necesita autenticación y, si aplica, rol.

Tareas:
- Inventariar rutas `POST`, `PATCH`, `DELETE`.
- Aplicar `requireAuth` y `requireRole` según la matriz de permisos.
- Decidir qué puede hacer cada rol.
- Probar 401 sin token y 403 con rol insuficiente.

Resultado:
- `docs/PERMISOS.md` con matriz por rol y decisiones D-5 a D-9.
- 12 rutas de escritura del salón protegidas con `requireAuth`; `pagar` mantiene además el rol.
- Login obligatorio en el frontend; si el token caduca, la app vuelve a pedirlo.
- 19 pruebas nuevas de autorización; los cuerpos de prueba usan IDs inexistentes para no escribir en `dev.db`.

Deuda registrada: `GET /api/sala` sigue público (D-5) hasta que el login sea obligatorio en toda la app.

Verificación: ninguna ruta de escritura queda abierta.

### Bloque 1.4 — Auditoría del actor

Estado: ✅ Hecho · Fecha: 2026-10-27 · Commit: pendiente de registrar · Verificación: `npm run verify` en verde con 56/56 pruebas; extremo a extremo manual pendiente hasta 2.1

Tareas:
- Propagar `actorId` a todos los eventos.
- Guardar quién abre, envía, anula, une, cobra y cambia pax.
- Probar que el evento registra el usuario correcto.

Resultado:
- Eventos nuevos `PEDIDO`, `LISTO` y `SPLIT`, todos con `actorId`.
- `markReady` carga el producto para que el evento diga qué se sirvió.
- La API expone `actor: { id, nombre }`; nunca email ni rol.
- Historial visible en la cuenta del servicio.
- 4 pruebas unitarias de serialización.

Deuda registrada: la prueba de extremo a extremo (crear servicio y comprobar el actor) necesita base desechable; se hará en 2.1.

Verificación: el histórico permite reconstruir quién hizo qué.

### Bloque 1.5 — Código individual por empleado

**Teoría:** un identificador compartido no permite atribuir acciones. Un código único por empleado sí.

Tareas:
- Diseñar el campo `codigo` único en `Usuario`.
- Migración con copia previa.
- Alta/baja de empleados y asignación de código.
- Login por código único.
- Mantener compatibilidad con los códigos 0/1/2 solo como datos iniciales.

Verificación: dos camareros tienen códigos distintos y la auditoría los diferencia.

### Bloque 1.6 — Endurecimiento de sesión

Tareas:
- Caducidad, logout y límite de intentos.
- Decidir si se añade PIN.
- Revisar CORS, cabeceras de seguridad y tamaño de cuerpo.

Verificación: pruebas de sesión expirada, código inválido y bloqueo temporal.

**Puerta de fase 1:** todas las escrituras protegidas, actor auditado y códigos individuales.

---

## 5. Fase 2 — Calidad, API y observabilidad

### Bloque 2.1 — Base de datos desechable para pruebas

Tareas:
- Script que copia/migra/seediza una base temporal.
- Tests de integración aislados.
- Limpieza automática.

### Bloque 2.2 — Pruebas de extremo a extremo

**Teoría:** una prueba E2E simula a una persona usando el navegador.

Tareas:
- Playwright.
- Flujo: abrir mesa → añadir producto → enviar → marcar listo → cobrar como gerente.
- Flujo negativo: camarero no cobra.

### Bloque 2.3 — Contrato de API documentado

Tareas:
- Documentar cada endpoint: método, ruta, permisos, entrada, salida, errores.
- Opcional: OpenAPI.
- Prueba de contrato para respuestas clave.

### Bloque 2.4 — Observabilidad

Tareas:
- Logs estructurados con identificador de petición.
- Health y readiness.
- Registro de errores sin filtrar datos sensibles.

### Bloque 2.5 — Accesibilidad y responsive

Tareas:
- Foco, teclado, contraste, etiquetas.
- Revisar en tablet y móvil.

**Puerta de fase 2:** `npm run verify` incluye unitarias, integración y E2E.

---

## 6. Fase 3 — Gerencia

**Objetivo:** el código `0` puede gestionar el restaurante.

### Bloque 3.1 — Especificación de Gerencia

Historias:
- Como gerente quiero cambiar precios.
- Como gerente quiero añadir/eliminar platos y bebidas.
- Como gerente quiero gestionar empleados y códigos.
- Como gerente quiero consultar cuentas históricas.
- Como gerente quiero abrir/cerrar caja y ver diferencias.

Cada historia con criterios de aceptación y contrato de API.

### Bloque 3.2 — Backend de carta

**Teoría:** CRUD = crear, leer, actualizar, borrar. El borrado de productos usados debe ser lógico (`activo = false`), no físico.

Tareas:
- Endpoints de productos con permisos de gerente.
- Validación de precio en céntimos y categoría.
- Pruebas.

### Bloque 3.3 — Pantalla de carta

Tareas:
- Listado, alta, edición y baja.
- Cambio de precio y disponibilidad.
- Confirmación antes de eliminar.

### Bloque 3.4 — Backend y pantalla de empleados

Tareas:
- CRUD de empleados.
- Código único, rol y estado activo.
- Protección del último gerente.
- Pruebas.

### Bloque 3.5 — Histórico de cuentas

Tareas:
- Endpoint de servicios cerrados con filtros por fecha.
- Detalle con líneas, pagos y eventos.
- Pantalla de histórico.

### Bloque 3.6 — Arqueo de caja

**Teoría:** arqueo = comparar lo esperado por el sistema con lo contado físicamente.

Tareas:
- Modelo de sesión de caja: apertura, cierre, efectivo esperado y contado.
- Diferencia y motivo.
- Pantalla y pruebas.

**Puerta de fase 3:** todo lo de Gerencia funciona solo con rol `GERENTE`.

---

## 7. Fase 4 — Cobro completo

### Bloque 4.1 — Especificación del cobro

Incluye:
- Efectivo, tarjeta y pago mixto.
- Pago parcial y división por asiento o importe.
- Propina.
- Cambio.
- Devolución.
- Ticket o recibo.
- Idempotencia: no cobrar dos veces por doble clic.

### Bloque 4.2 — Modelo de pagos

**Teoría:** un pago es una entidad, no un campo. Una cuenta puede tener varios pagos.

Tareas:
- Modelo `Pago` y relación con `Servicio`.
- Migración y copia previa.
- Pruebas de suma de pagos y saldo pendiente.

### Bloque 4.3 — Motor de cobro

Tareas:
- Transacciones de base de datos.
- Validar que la suma no supere el total.
- Cerrar el servicio solo cuando esté pagado.
- Registrar método, importe, propina y actor.

### Bloque 4.4 — Interfaz de cobro

Tareas:
- Elegir método e importe.
- Calcular cambio.
- Añadir propina.
- Dividir como pida el cliente.
- Confirmar y mostrar resumen.

### Bloque 4.5 — Devoluciones y auditoría

Tareas:
- Devolución total o parcial con motivo.
- Evento y permiso de gerente.

**Puerta de fase 4:** se puede cobrar de varias formas y el saldo siempre cuadra.

---

## 8. Fase 5 — Reservas

### Bloque 5.1 — Especificación y estados
- Reservada, check-in, no-show, cancelada.

### Bloque 5.2 — Backend
- CRUD de reservas, validación de mesa y fecha.
- Check-in crea Servicio.
- Pruebas.

### Bloque 5.3 — Mapa de reservas
- Vista separada del mapa real.
- Colores y acciones.

**Puerta de fase 5:** reserva y ocupación real no se mezclan.

---

## 9. Fase 6 — Tiempo real y colores

### Bloque 6.1 — Teoría y elección
- SSE (una dirección) frente a WebSocket (bidireccional).
- Para colas de producción, SSE suele bastar.

### Bloque 6.2 — Backend de eventos
- Emitir eventos al crear, enviar, marcar listo o cobrar.
- Reconexión del cliente.

### Bloque 6.3 — Cocina y Barra en vivo
- Actualización sin refrescar.
- Aviso sonoro opcional.
- Colores por tiempo: verde, ámbar, rojo.

**Puerta de fase 6:** dos pantallas abiertas se actualizan solas.

---

## 10. Fase 7 — Comanda flexible

### Bloque 7.1 — Especificación
- Notas, alergias, modificadores, cantidades, mover líneas.

### Bloque 7.2 — Modelo y backend
- Modificadores y notas.
- Editar cantidad y mover línea entre asientos.
- Pruebas de totales.

### Bloque 7.3 — Interfaz
- Añadir nota, editar, mover.
- Pestañas inferiores si se confirma la idea de navegación.

**Puerta de fase 7:** la comanda se adapta al cliente sin romper totales.

---

## 11. Fase 8 — Stock y 86

### Bloque 8.1 — Disponibilidad
- Campo de stock o booleano agotado.
- Marcar 86 desde carta o cocina.

### Bloque 8.2 — Efecto en pedidos
- No permitir pedir agotados.
- Mostrar aviso en carta.
- Pruebas.

**Puerta de fase 8:** un producto agotado no se puede pedir.

---

## 12. Fase 9 — PWA y offline

### Bloque 9.1 — Shell cacheado
- Service worker.
- Carga básica sin red.

### Bloque 9.2 — Cola de acciones
- Encolar pedidos si falla la red.
- Reintentar al volver.
- Resolver conflictos.

### Bloque 9.3 — Indicadores
- Sin conexión, pendiente de sincronizar, error.

**Puerta de fase 9:** se puede seguir tomando nota con WiFi inestable.

---

## 13. Fase 10 — Informes

### Bloque 10.1 — Consultas
- Ventas por día, productos más vendidos, tiempos, empleados.

### Bloque 10.2 — Pantalla
- Filtros por fecha y turno.
- Totales y gráficos simples.
- Exportación CSV.

**Puerta de fase 10:** el gerente obtiene información real de operación.

---

## 14. Fase 11 — Producción

### Bloque 11.1 — PostgreSQL
- Migrar de SQLite a PostgreSQL.
- Variables de entorno y migraciones.

### Bloque 11.2 — Despliegue
- Backend, frontend y base de datos.
- HTTPS y dominio.

### Bloque 11.3 — Copias y recuperación
- Copia automática.
- Prueba de restauración.

### Bloque 11.4 — Monitorización
- Logs, salud, alertas y errores.

### Bloque 11.5 — Release
- `v1.0.0`, changelog, retrospectiva.

**Puerta de fase 11:** la aplicación vive en internet y se puede recuperar.

---

## 15. Qué aprenderás de backend, por bloque

| Bloque | Concepto |
|---|---|
| 1.1 | HTTP, Express, middleware, capas |
| 1.2 | Validación, errores, códigos de estado |
| 1.3 | Autenticación, autorización, roles |
| 1.4 | Auditoría, actor, eventos |
| 1.5 | Modelo de datos, migraciones, unicidad |
| 1.6 | Sesiones, JWT, rate limiting, CORS |
| 2.1 | Bases de prueba, aislamiento |
| 2.2 | E2E, automatización |
| 2.3 | Contratos de API |
| 2.4 | Observabilidad y logs |
| 3.x | CRUD, permisos, borrado lógico, arqueo |
| 4.x | Transacciones, integridad, pagos, idempotencia |
| 5.x | Estados, fechas, reservas |
| 6.x | Eventos, SSE, reconexión |
| 7.x | Modelos uno-a-muchos, totales |
| 8.x | Disponibilidad y reglas de negocio |
| 9.x | Caché, sincronización, conflictos |
| 10.x | Consultas agregadas, SQL, informes |
| 11.x | Despliegue, Postgres, backups, monitorización |

---

## 16. Cómo estudiaremos cada bloque

1. **Antes:** te explico la teoría con una analogía y el vocabulario mínimo.
2. **Durante:** leemos juntos el código existente y escribimos la prueba.
3. **Después:** tú explicas el bloque en 5 frases.
4. **Reto:** haces un cambio pequeño sin ayuda (endpoint, validación o test).
5. **Revisión:** corrigimos y lo conectamos con la teoría.

**Regla de oro:** si no puedes explicarlo, todavía no está aprendido; como mucho, está copiado.

---

## 17. Primer bloque a ejecutar

**Bloque 0.1 — Línea base verificable.**

Salida esperada:
- Proyecto arrancando desde cero.
- Tag `v0.1.0`.
- `npm run verify` (o equivalente) pasando.
- Documento breve de arranque y estado.

Después: Bloque 0.2 (trazabilidad) y Bloque 1.1 (recorrido del backend).

---

## 18. Resumen

El proyecto no necesita más funciones para ser valioso: necesita **orden, pruebas, seguridad y despliegue**. Las funciones llegarán después, una por una. El objetivo final no es solo que ALFRED funcione, sino que tú puedas decir con verdad: “lo entiendo, lo construí, lo verifiqué y lo desplegué”.
