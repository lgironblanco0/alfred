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

### 3.3. Diseño implementado (Bloque 2.1)

```text
npm test
  └─ node scripts/test-with-db.mjs
       1. crea una carpeta temporal única fuera del repositorio
       2. genera una URL SQLite absoluta dentro de esa carpeta
       3. exporta DATABASE_URL para migraciones, seed y pruebas
       4. ejecuta `prisma migrate deploy` contra esa base
       5. ejecuta `prisma db seed` (8 empleados, mesas y carta)
       6. lanza `tsx --test tests/**/*.test.ts`
       7. elimina la carpeta temporal en `finally`
```

Si se define `ALFRED_TEST_KEEP_DB=1`, la base se conserva y se imprime su ruta para depurar.

### 3.4. Requisito técnico — ✅ aplicado

`prisma/schema.prisma` ya usa:

```prisma
url = env("DATABASE_URL")
```

`.env.example` declara `DATABASE_URL="file:./dev.db"` y `.env` (no versionado) lo repite para desarrollo. El script de pruebas sobrescribe la variable con la ruta temporal.

**Lección:** cambiar el esquema a `env()` no basta. Hay que ejecutar `prisma generate` para que el cliente generado deje de llevar la URL antigua incrustada. Sin ese paso, las migraciones van a la base temporal pero el seed y la API siguen escribiendo en `dev.db`.

### 3.5. Concurrencia

- **Unitarias:** paralelas, sin estado compartido.
- **Integración:** una base por ejecución. Los archivos se ejecutan **en serie** (`--test-concurrency=1`) porque comparten esa base y varios crean mesas al vuelo; en paralelo chocaban al calcular el siguiente `numeroMesa`. Las pruebas que necesitan una mesa libre crean la suya con `createTable: true` (decisión T-3). No se depende de números de mesa fijos.
- **E2E:** una base por suite, servidor en puerto efímero.

Si aparecen condiciones de carrera, el siguiente paso es `--test-concurrency=1` o una base por archivo.

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

| Aspecto | Hoy (tras 2.1) | Objetivo |
|---|---|---|
| Pruebas existentes | 78, en cinco archivos | Reorganizadas por nivel |
| Base de datos | Temporal por ejecución (`scripts/test-with-db.mjs`) | Igual |
| Aislamiento | Total: `dev.db` no se toca | Igual |
| E2E | 1 flujo crítico con Playwright (`e2e/sala.spec.ts`) | Flujos críticos ampliados |
| CI | Workflow listo con Chromium, sin remoto | `npm run verify` en cada push |
| Cobertura | No medida | Medida y orientada al riesgo |

**Riesgo resuelto en el Bloque 2.1:** las pruebas ya no arrancan contra `dev.db`. El runner crea, migra, siembra y borra una base temporal. La igualdad del hash de `dev.db` antes y después de `npm test` es la evidencia.

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
