# Estrategia de pruebas — ALFRED

Documento del Bloque 0.4. Define **qué se prueba, en qué nivel y con qué datos**, antes de escribir más pruebas.

La estrategia se aplica a partir de la Fase 2. La infraestructura de base de datos desechable se implementa en el Bloque 2.1; aquí queda la decisión y el diseño.

---

## 1. Principios

1. **Probar el riesgo, no el número.** No perseguimos un porcentaje de cobertura: cubrimos primero lo que puede perder dinero, datos o seguridad.
2. **Determinista.** Una prueba debe dar el mismo resultado siempre, sin depender de la hora, del orden ni de datos previos.
3. **Aislada.** Ninguna prueba toca `prisma/dev.db` ni datos reales.
4. **Rápida.** Lo unitario se ejecuta en milisegundos; lo de integración, en segundos.
5. **Reproducible.** Cualquiera puede ejecutar las pruebas desde una copia limpia.
6. **Una prueba por comportamiento.** Evitar tests gigantes que comprueban cinco cosas y no dicen cuál falló.

---

## 2. Pirámide de pruebas

```text
        E2E          pocas, lentas, flujo completo
      Integración    endpoints + base de datos
       Unitarias     funciones puras, rápidas
```

| Nivel | Qué prueba | Dónde vive | Velocidad | Cantidad |
|---|---|---|---|---|
| Unitaria | Funciones puras: dinero, tokens, validaciones, cálculo de estación, formateo | `tests/unit/` | Milisegundos | Muchas |
| Integración | Ruta HTTP + middleware + servicio + Prisma + SQLite temporal | `tests/integration/` | Segundos | Media |
| Contrato | Forma y códigos de respuesta de endpoints clave | `tests/integration/` | Segundos | Media |
| E2E | Flujo real en navegador con backend y base temporal | `tests/e2e/` | Decenas de segundos | Pocas |
| Manual | Aspectos visuales, responsive, accesibilidad, sensación de uso | Checklist | Minutos | Por bloque visual |

### 2.1. Qué va en unitarias

- `src/auth/password.ts`: hash y verificación.
- `src/auth/tokens.ts`: firma, verificación, caducidad.
- `src/sala/serialize.ts`: totales, descuentos, redondeo en céntimos.
- `web/src/lib/format.ts`: formato de tiempo y dinero.
- `web/src/lib/estacion.ts`: categoría → Cocina/Barra.
- Validaciones Zod aisladas, si se extraen a funciones.

No usan base de datos, red ni reloj real. Si una función depende de `Date.now()`, se le pasa la fecha como parámetro.

### 2.2. Qué va en integración

- Cada endpoint de escritura: caso permitido, 401, 403 y validación.
- Reglas de negocio del salón: walk-in, unir mesas, añadir línea, enviar pase, anular, cobrar.
- Invariantes: una mesa, un servicio abierto; asiento dentro de rango; precio congelado.
- Contrato de `GET /api/sala` y de los errores.
- Migraciones y seed sobre una base nueva.

Se prueba la ruta HTTP real, no solo el servicio. Así se cubren middleware, permisos y serialización.

### 2.3. Qué va en E2E

Solo los flujos que justifican el coste:

1. Abrir mesa → añadir producto → enviar a Cocina → marcar listo → cobrar como gerente.
2. Camarero intenta cobrar → ve la acción bloqueada o recibe error.
3. Unir dos mesas con pedidos → la cuenta queda compartida.
4. Reducir pax por debajo de un asiento ocupado → error visible.
5. Recargar la página y recuperar la sesión.

Herramienta prevista: **Playwright**.

### 2.4. Qué NO se prueba

- El funcionamiento interno de Prisma, Express o `jsonwebtoken`.
- Librerías de terceros.
- Estilos pixel perfect (para eso hay revisión visual).
- Cada combinación posible de datos: se prueban clases de equivalencia y límites.

---

## 3. Base de datos desechable

### 3.1. Decisión

Cada ejecución de pruebas de integración usa **una base SQLite temporal**, creada desde cero, migrada y sembrada con datos mínimos. Al terminar, se elimina.

Nunca se usa `prisma/dev.db`.

### 3.2. Por qué

- `dev.db` contiene datos de demostración que cambian.
- Una prueba que escribe puede dejar basura o romper el entorno.
- Los tests deben poder ejecutarse en paralelo sin pisarse.
- Si una prueba falla, no debe afectar a los datos del restaurante.

### 3.3. Diseño previsto

```text
1. El test setup crea una carpeta temporal única.
2. Genera una URL SQLite absoluta dentro de esa carpeta.
3. Exporta DATABASE_URL antes de importar Prisma.
4. Ejecuta `prisma migrate deploy` contra esa base.
5. Siembra fixtures mínimos y deterministas.
6. Ejecuta las pruebas con concurrencia controlada.
7. Elimina la base y la carpeta temporal.
```

### 3.4. Requisito técnico

Hoy `prisma/schema.prisma` tiene la URL escrita a mano:

```prisma
url = "file:./dev.db"
```

Para que la base sea configurable, el Bloque 2.1 debe cambiarla a:

```prisma
url = env("DATABASE_URL")
```

Y definir en `.env.example`:

```text
DATABASE_URL=file:./dev.db
```

Para pruebas, el setup sobrescribe `DATABASE_URL` con la ruta temporal.

> La sintaxis exacta de la URL absoluta en Windows se validará al implementar el helper. La decisión es usar una ruta absoluta generada en tiempo de ejecución, nunca una ruta relativa ambigua.

### 3.5. Concurrencia

- **Unitarias:** paralelas, sin estado compartido.
- **Integración:** una base por ejecución y `--test-concurrency=1` al principio, para evitar condiciones de carrera entre archivos.
- **E2E:** una base por suite, servidor en puerto efímero.

Si más adelante el tiempo de ejecución crece, se podrá pasar a una base por archivo.

---

## 4. Datos de prueba

### 4.1. Reglas

- Nada de datos reales ni personales.
- Nada de depender de `dev.db`.
- IDs y valores explícitos, no autogenerados cuando la prueba los necesite.
- Cada prueba crea lo que necesita y no asume lo que dejó otra.
- Fechas fijas, no `new Date()` sin control.

### 4.2. Fixtures mínimos

| Entidad | Datos mínimos |
|---|---|
| Usuarios | Gerente, encargado y dos camareros con códigos distintos |
| Mesas | Una de comedor, una de terraza, una de barra y un punto de barra |
| Productos | Un plato de Cocina, una bebida de Barra y un producto inactivo |
| Promociones | Una de porcentaje y una de importe fijo (si se mantienen) |
| Servicio | Se crea dentro de cada prueba, no en el fixture global |

### 4.3. Builders

Para no repetir datos, se usarán funciones tipo:

```ts
crearMesa({ zona: "TERRAZA", capacidad: 4 })
crearProducto({ categoria: "BEBIDA", precio: 250 })
abrirServicio({ mesaId, pax: 2 })
```

Los builders viven en `tests/fixtures/` y tienen valores por defecto válidos. Cada prueba sobrescribe solo lo que le importa.

### 4.4. Aislamiento

- La base se crea por ejecución.
- Cada archivo limpia sus tablas o usa transacciones con rollback cuando sea posible.
- Ninguna prueba depende del orden de otra.

---

## 5. Organización de archivos

```text
tests/
├── unit/
│   ├── auth.test.ts
│   ├── format.test.ts
│   └── totals.test.ts
├── integration/
│   ├── auth.routes.test.ts
│   ├── sala.routes.test.ts
│   ├── comandas.test.ts
│   └── seguridad.test.ts
├── e2e/
│   └── flujo-completo.spec.ts
├── fixtures/
│   ├── builders.ts
│   └── seed-minimo.ts
└── helpers/
    ├── test-db.ts
    └── test-server.ts
```

La estructura actual (`tests/api.test.ts`, `tests/auth-core.test.ts`) se migrará en la Fase 2 sin perder casos.

---

## 6. Cobertura y prioridades

### 6.1. Prioridad por riesgo

1. **Dinero**: cobro, totales, descuentos, devoluciones.
2. **Seguridad**: autenticación, autorización, validación de entrada.
3. **Datos**: migraciones, invariantes, transacciones.
4. **Operación**: comandas, unión de mesas, pax, producción.
5. **Experiencia**: búsqueda, responsive, accesibilidad.

### 6.2. Objetivo

- **100 % de los criterios de aceptación críticos** con prueba automatizada.
- Cobertura de líneas orientativa del **70 % en backend**, sin convertirla en una meta ciega.
- Cada bug corregido deja una prueba de regresión.

No se acepta una funcionalidad nueva sin prueba salvo excepción documentada en la Definition of Done.

---

## 7. Comandos previstos

| Comando | Qué ejecuta | Cuándo |
|---|---|---|
| `npm test` | Unitarias + integración | Cada cambio |
| `npm run test:unit` | Solo unitarias | Mientras se programa |
| `npm run test:integration` | Solo integración con base temporal | Antes de commit |
| `npm run test:e2e` | Playwright | Antes de release |
| `npm run verify` | Typecheck + builds + tests | Antes de commit y en CI |

`npm run verify` se crea en el Bloque 0.5. Los comandos de unitarias, integración y E2E se añaden cuando existan sus carpetas.

---

## 8. Estado actual y deuda

| Aspecto | Hoy | Objetivo |
|---|---|---|
| Pruebas existentes | 15, en dos archivos | Reorganizadas por nivel |
| Base de datos | `dev.db` | Temporal por ejecución |
| Aislamiento | Parcial: los tests actuales no escriben, pero comparten base | Total |
| E2E | Ninguna | Flujos críticos con Playwright |
| CI | Ninguna | `npm run verify` en cada push |
| Cobertura | No medida | Medida y orientada al riesgo |

**Riesgo actual:** los tests de API arrancan la app contra `dev.db`. Hoy no escriben datos, pero un test futuro que lo haga podría contaminar el entorno. Se corrige en el Bloque 2.1.

---

## 9. Definition of Done para tareas de prueba

Una tarea de prueba está terminada cuando:

- [ ] Prueba un comportamiento, no una implementación.
- [ ] Tiene un nombre que describe el resultado esperado.
- [ ] Falla si el comportamiento se rompe.
- [ ] No depende de datos externos ni del orden.
- [ ] Limpia lo que crea.
- [ ] Se ejecuta en local y en CI.
- [ ] El mensaje de fallo permite entender qué pasó.

---

## 10. Decisiones registradas

| ID | Decisión | Motivo |
|---|---|---|
| TP-01 | Base SQLite temporal por ejecución | Aislamiento y reproducibilidad |
| TP-02 | `DATABASE_URL` configurable desde entorno | Permite dev, test y producción sin cambiar código |
| TP-03 | Playwright para E2E | Simula al usuario real y cubre frontend + backend |
| TP-04 | Priorizar riesgo sobre porcentaje de cobertura | El objetivo es evitar pérdidas, no maquillar métricas |
| TP-05 | Concurrencia 1 al inicio en integración | Evita carreras entre pruebas que comparten base |
| TP-06 | Builders con valores válidos por defecto | Menos ruido y pruebas más legibles |

---

## 11. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 0.4 | Estrategia inicial: niveles, base desechable, fixtures y prioridades |
