# Auditoría del actor — Bloque 1.4

Especificación de la trazabilidad de acciones por empleado.

Escrito antes del código.

---

## 1. Problema

Desde el Bloque 1.3 todas las escrituras exigen identidad, pero la auditoría está a medias:

| Acción | ¿Registra evento? | ¿Guarda actor? |
|---|---|---|
| Abrir mesa | Sí (`APERTURA`) | Sí |
| Cambiar pax | Sí (`PAX`) | Sí |
| Unir mesas | Sí (`MERGE`) | Sí |
| Cancelar servicio | Sí (`CANCELACION`) | Sí |
| Enviar pase | Sí (`LLAMADA`) | Sí |
| Anular línea | Sí (`ANULACION`) | Sí |
| Aplicar/retirar promo | Sí (`DESCUENTO`) | Sí |
| Cobrar | Sí (`PAGO`) | Sí |
| **Añadir producto** | **No** | **No** |
| **Marcar listo** | **No** | **No** |
| **Cambiar reparto** | **No** | **No** |

Además, aunque el evento guarda `actorId`, la API **no devuelve quién fue**. El histórico existe en la base de datos pero nadie puede leerlo.

Consecuencia práctica: ante una consumición anulada o un descuento aplicado, no se puede responder "¿quién lo hizo?" desde la aplicación.

---

## 2. Regla

**Toda escritura que cambia el estado del servicio deja un evento con el actor que la ejecutó.**

Tipos de evento usados:

| Tipo | Cuándo |
|---|---|
| `APERTURA` | Se abre el servicio |
| `PAX` | Cambia el número de comensales |
| `PEDIDO` | Se añade una línea (nuevo) |
| `LLAMADA` | Se envía el pase |
| `LISTO` | Cocina o barra marca una línea como lista (nuevo) |
| `ANULACION` | Se anula una línea con motivo |
| `MERGE` | Se unen mesas |
| `DESCUENTO` | Se aplica o retira una promoción |
| `SPLIT` | Cambia el modo de reparto (nuevo) |
| `CANCELACION` | Se cancela el servicio |
| `PAGO` | Se cobra la cuenta |

---

## 3. Contrato de lectura

Cada evento serializado expone:

```json
{
  "id": 42,
  "tipo": "ANULACION",
  "detalle": "Se rompió la copa",
  "createdAt": "2026-10-27T20:14:00.000Z",
  "actor": { "id": 3, "nombre": "Camareros" }
}
```

- `actor` es `null` cuando el evento es anterior a la autenticación obligatoria o el usuario fue eliminado (`onDelete: SetNull`).
- Se devuelve **id y nombre**, nunca email ni rol: el histórico no necesita más y no conviene filtrar datos de empleados.

**Decisión A-1 — No se guarda el nombre en el evento.** Se guarda la referencia (`actorId`) y se resuelve al leer. Si el empleado cambia de nombre, el histórico muestra el actual. Si se borra, el evento queda con `actor: null` pero el `detalle` sigue siendo válido.

**Decisión A-2 — El actor no se acepta desde el cliente.** Se toma siempre de `request.usuario`, que viene del token verificado. Un cliente no puede declarar "esto lo hizo el gerente".

**Decisión A-3 — Añadir producto genera evento propio.** Así el histórico explica también qué se pidió y cuándo, no solo las excepciones.

---

## 4. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | Un evento con actor serializa `actor: { id, nombre }` | `tests/serialize.test.ts` |
| CA-2 | Un evento sin actor serializa `actor: null` | `tests/serialize.test.ts` |
| CA-3 | Un servicio sin eventos serializa `eventos: []` | `tests/serialize.test.ts` |
| CA-4 | Añadir producto, marcar listo y cambiar reparto reciben `actorId` desde la ruta | Revisión + `npm run verify` |
| CA-5 | Las rutas de escritura no aceptan el actor desde el cuerpo | `tests/authz.test.ts` |
| CA-6 | El histórico es visible en la interfaz, con hora y nombre | Manual |

**Limitación conocida:** la prueba que crea un servicio real y comprueba que el evento guarda al camarero correcto necesita una base desechable. Se hará en 2.1. Hasta entonces, el contrato de lectura se prueba en unitario y la propagación se verifica por revisión y manualmente en la interfaz.

---

## 5. Alcance

### Entra

- Eventos `PEDIDO`, `LISTO` y `SPLIT`.
- `actorId` en las tres rutas que faltaban.
- Serialización del actor.
- Historial visible en la cuenta del servicio.

### No entra

| Tema | Fase |
|---|---|
| Código individual por camarero (hoy el código 2 es compartido) | 1.5 |
| Histórico global de movimientos y filtros por empleado | 3 |
| Trazabilidad económica del cobro (importe, método, arqueo) | 4 |
| Base de datos desechable para probar todo lo anterior | 2.1 |

---

## 6. Definición de terminado

- [x] Especificación escrita.
- [x] Pruebas de serialización escritas y en verde.
- [x] Eventos y `actorId` propagados.
- [x] Historial visible en la interfaz.
- [x] `npm run verify` en verde.
- [x] Documento enlazado desde README y CHANGELOG.

### 6.1. Evidencia

- Eventos nuevos: `PEDIDO`, `LISTO` y `SPLIT`, todos con `actorId`.
- `markReady` carga el producto para que el evento diga qué se sirvió, no solo "línea 42".
- La API expone `actor: { id, nombre }` y nunca email ni rol.
- 4 pruebas unitarias de serialización; **56 pruebas en total en verde**.
- Historial visible en la cuenta del servicio: hora, detalle y nombre.

**Verificación manual pendiente:** reiniciar el servidor, entrar con el código 2, abrir una mesa y añadir un producto. El historial debe mostrar el movimiento con el nombre del usuario. La prueba automática de ese extremo a extremo llegará en 2.1 con base desechable.

---

## 7. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 1.4 | Contrato de auditoría y criterios |
| 2026-10-27 | 1.4 | Eventos `PEDIDO`, `LISTO` y `SPLIT`, actor serializado e historial en la interfaz |

