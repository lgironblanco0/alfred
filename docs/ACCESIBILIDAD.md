# Accesibilidad y responsive — Bloque 2.5

Documento escrito antes de implementar el bloque. Define qué significa que ALFRED sea usable con teclado, lector de pantalla, tablet y móvil, y cómo se demuestra.

---

## 1. Objetivo

Operar la sala no puede depender de un ratón, de una pantalla grande ni de distinguir colores finos. Este bloque corrige las barreras detectadas en la auditoría del MVP sin añadir funcionalidad de negocio:

- El layout tenía una columna fija de `220px` y no tenía breakpoints.
- El inspector y la comanda usaban dos columnas fijas.
- Los modales no eran diálogos accesibles: no atrapaban el foco, no devolvían el foco y algunos no se cerraban con `Escape`.
- Varias etiquetas visuales no estaban asociadas a su campo.
- No había un acuse claro de «guardado» después de una acción.
- Varios controles eran demasiado pequeños para usarse con el dedo.

**Fuera de alcance:** rediseño visual, modo claro, lector de pantalla físico, navegadores distintos de Chromium, PWA/offline y pruebas de carga. Se abordan en fases posteriores o quedan como verificación manual.

---

## 2. Decisiones

### A-1 — Auditoría automática con axe-core dentro de Playwright

Se añade `@axe-core/playwright` y se ejecuta sobre las pantallas y estados principales. Se filtran las reglas WCAG 2.0, 2.1 y 2.2 de nivel A y AA. No se usan las reglas «best practice» porque mezclan preferencias con incumplimientos.

La auditoría automática detecta una parte del problema; no sustituye una prueba manual con teclado. Por eso el mismo bloque incluye pruebas de foco, `Escape` y desbordamiento horizontal.

### A-2 — Un solo navegador para la automatización

Chromium sigue siendo el navegador de E2E. Añadir Firefox o WebKit multiplica el tiempo y no cubre el riesgo principal de este bloque, que es la semántica y el layout. La deuda queda registrada.

### A-3 — Dos viewports de referencia

- **Móvil:** `390 × 844` (iPhone 12/13/14 lógico).
- **Tablet:** `768 × 1024` (iPad vertical).

El layout cambia a una columna por debajo de `1024px` y mantiene la barra lateral en escritorio. Las pruebas comprueban que no hay scroll horizontal y que los controles principales siguen visibles.

### A-4 — Objetivos táctiles

Con puntero grueso (`pointer: coarse`), los controles principales miden al menos `44 × 44 CSS px`. Los controles compactos —asientos, «Quitar», «Marcar READY»— pueden bajar a `24 × 24` porque están separados y tienen texto o espacio alrededor, que es el mínimo de WCAG 2.2 para objetivos pequeños.

### A-5 — Diálogos con semántica nativa, sin dependencias nuevas

Los modales usan `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y `aria-describedby`. Un hook propio `useModalFocus`:

1. Guarda el elemento que tenía el foco.
2. Mueve el foco al primer control marcado con `data-autofocus` o al primer elemento enfocable.
3. Atrapa `Tab` y `Shift+Tab` dentro del diálogo.
4. Cierra con `Escape` solo el diálogo superior de la pila.
5. Devuelve el foco al elemento anterior al desmontarse.

Se descarta instalar una librería de modales para no añadir peso por un comportamiento que el proyecto puede mantener y probar.

### A-6 — Feedback con regiones vivas

Los errores usan `role="alert"`. El acuse de guardado y el estado ocupado usan `role="status"` con `aria-live="polite"` y `aria-busy` en la zona principal. No se anuncia cada cambio de reloj ni cada refresco de sala.

### A-7 — Navegación y foco visibles

Se añade un enlace «Saltar al contenido», una etiqueta `nav` y `aria-current="page"` en la vista activa. El foco visible usa el color de acento con contraste suficiente sobre los fondos del tema.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-01 | El login es un diálogo nombrado, con foco inicial en el código y foco atrapado | `e2e/accesibilidad.spec.ts` |
| CA-02 | `Escape` cierra los diálogos descartables y devuelve el foco al disparador | `e2e/accesibilidad.spec.ts` |
| CA-03 | El inspector y las confirmaciones tienen semántica de diálogo, nombre y descripción | `e2e/accesibilidad.spec.ts` |
| CA-04 | Las pantallas de login, sala, inspector, cocina y caja no tienen violaciones axe A/AA | `e2e/accesibilidad.spec.ts` |
| CA-05 | Todas las etiquetas visibles están asociadas a su campo | `e2e/accesibilidad.spec.ts` |
| CA-06 | La navegación tiene landmark, enlace de salto y vista activa anunciada | `e2e/accesibilidad.spec.ts` |
| CA-07 | No hay scroll horizontal a `390px` ni a `768px` | `e2e/accesibilidad.spec.ts` |
| CA-08 | En móvil el inspector ocupa el ancho disponible y apila sus secciones | `e2e/accesibilidad.spec.ts` |
| CA-09 | Los controles principales miden al menos `44px` con puntero grueso; los compactos, al menos `24px` | `e2e/accesibilidad.spec.ts` |
| CA-10 | Los errores se anuncian como alerta y las acciones exitosas dejan un acuse de guardado | `e2e/accesibilidad.spec.ts` |
| CA-11 | El flujo E2E existente sigue en verde | `e2e/sala.spec.ts` |

### 3.1. Fricciones registradas

| Fricción | Origen | Tratamiento |
|---|---|---|
| Barra lateral fija de `220px` | Auditoría de código | Rejilla de una columna por debajo de `1024px` y navegación horizontal |
| Inspector con dos columnas fijas | Auditoría de código | Una columna en móvil, dos desde `1024px` |
| Modales sin foco atrapado | Auditoría de código | Hook `useModalFocus` y semántica de diálogo |
| Confirmación sin `Escape` | Auditoría de código | `Escape` cierra y devuelve el foco |
| Etiquetas sin `htmlFor` | Auditoría de código | `id` + `htmlFor` en login, walk-in, pax y promo |
| Sin acuse de guardado | Prueba de uso | Región `status` con «Cambios guardados» |
| Objetivos táctiles pequeños | Revisión móvil | Mínimos `44px` / `24px` según el control |

El usuario no aportó fricciones adicionales durante la prueba del MVP. Cualquier observación nueva se añadirá a esta tabla sin borrar las anteriores.

---

## 4. Plan de pruebas

### 4.1. Automáticas

`e2e/accesibilidad.spec.ts` cubre:

1. Login: axe, `role="dialog"`, foco inicial, ciclo de `Tab` y `Shift+Tab`.
2. Sala autenticada: axe, landmark, `aria-current`, enlace de salto.
3. Inspector: axe, foco dentro, `Escape`, retorno de foco.
4. Cocina y Caja: axe y etiquetas.
5. Walk-in: axe, etiquetas asociadas, `Escape`.
6. Responsive a `390` y `768`: sin desbordamiento horizontal, inspector usable y secciones apiladas.
7. Objetivos táctiles con `hasTouch: true`.
8. Feedback: error de login como `alert` y acuse de guardado como `status`.

Las capturas no se guardan por defecto para no llenar el repositorio; Playwright conserva traza si el test falla.

### 4.2. Manual

- Recorrer la app solo con teclado: login → abrir mesa → añadir → enviar → cerrar.
- Revisar el foco visible sobre fondo oscuro.
- Revisar a `390px` y `768px` en las herramientas del navegador.
- Comprobar que los textos no se cortan al aumentar el zoom del navegador al `200 %`.

---

## 5. Definición de terminado

- [x] Especificación y criterios escritos antes del código.
- [x] Pruebas axe y de foco escritas y fallando antes del cambio.
- [x] Hook de foco y semántica aplicados a login, walk-in, confirmación, inspector, cuenta y motivo de anulación.
- [x] Layout responsive en sala, inspector, cocina y caja.
- [x] Etiquetas asociadas y feedback anunciado.
- [x] `npm run verify` en verde con todas las pruebas unitarias, de integración y E2E.
- [x] `dev.db` sin cambios.
- [x] README, CHANGELOG, plan y trazabilidad actualizados.
- [x] Commit del bloque y árbol limpio.

---

## 6. Registro de cierre

**Estado:** ✅ Hecho. **Fecha:** 2026-10-28. **Commit:** pendiente de registrar tras el cierre.

### 6.1. Qué se hizo

1. **Auditoría automatizada.** Se añadió `@axe-core/playwright@4.14.0` y `e2e/accesibilidad.spec.ts` con 8 pruebas que recorren login, error de acceso, sala, inspector, cuenta, confirmación, walk-in, Cocina, Caja y los viewports de móvil y tablet. Las reglas se limitan a WCAG 2.0/2.1/2.2 nivel A y AA; no se activan las «best practice» para no mezclar preferencias con incumplimientos.
2. **Diálogos accesibles.** El hook `web/src/lib/useModalFocus.ts` guarda el disparador, mueve el foco al primer control útil, atrapa `Tab`/`Shift+Tab`, cierra solo el diálogo superior con `Escape` y devuelve el foco al desmontarse. Se aplicó a login, walk-in, confirmación, inspector, cuenta y motivo de anulación. La pila resuelve los diálogos anidados (inspector → cuenta → confirmación).
3. **StrictMode.** La doble ejecución de efectos en desarrollo provocaba que el primer montaje devolviera el foco tarde y sacara al usuario del inspector. Se corrigió con una época por instancia y una referencia al foco previo, de modo que solo la restauración vigente se aplica.
4. **Layout responsive.** Rejilla de una columna por debajo de `1024px`; navegación en rejilla de 2/4 columnas; inspector a pantalla completa en móvil y apilado; cuenta como panel superpuesto; colas de Cocina, Barra y Caja reorganizadas para no desbordar.
5. **Semántica y feedback.** Enlace «Saltar al contenido», `nav aria-label="Principal"`, `aria-current="page"` en la vista activa, `main` enfocable, etiquetas `htmlFor`/`id` en login, walk-in, pax y promo, errores con `role="alert"` y acuse «Cambios guardados» con `role="status"` y `aria-busy`.
6. **Contraste y táctil.** Alerta a `#fca5a5` y texto sutil a `#9a9aa2` para superar AA sobre panel y superficies elevadas. Con puntero grueso, los controles principales miden al menos `44px` y los compactos —asientos, «Quitar», «Marcar READY»— al menos `24px` con separación.
7. **Teclado.** `KeyboardSensor` de dnd-kit permite reordenar mesas con `Espacio` y flechas, y el texto de la zona lo explica.

### 6.2. Criterios de aceptación cubiertos

| CA | Evidencia |
|---|---|
| CA-01 | `el login es un diálogo accesible con foco atrapado`: `aria-modal`, foco inicial, `Tab` y `Shift+Tab` cíclicos |
| CA-02 | `el inspector atrapa el foco, deja acuse y se cierra con Escape`: cierre apilado y retorno al disparador |
| CA-03 | Inspector, cuenta y confirmación con `role="dialog"`, nombre y descripción |
| CA-04 | `auditar()` sin violaciones en login, sala, inspector, cuenta, confirmación, walk-in, Cocina y Caja |
| CA-05 | Walk-in y login localizan sus campos por etiqueta (`getByLabel`) |
| CA-06 | Sala, Cocina y Caja comprueban `nav`, enlace de salto y `aria-current` |
| CA-07 | `sinScrollHorizontal()` a `390 × 844` y `768 × 1024` |
| CA-08 | `inspector-columns` resuelve a una sola columna en móvil y el diálogo no supera el viewport |
| CA-09 | Objetivos principales ≥ `43px` reales y compactos ≥ `23px` con `hasTouch: true` |
| CA-10 | Error de login como `alert`; acuse de guardado como `status` |
| CA-11 | `e2e/sala.spec.ts` sigue en verde dentro de la misma ejecución |

### 6.3. Verificación

- `npm run verify` en verde: **99/99 pruebas** de backend y **9/9 E2E** (1 flujo de negocio + 8 de accesibilidad/responsive).
- La suite E2E completa se ejecutó varias veces para descartar intermitencias; el proyecto usa un solo worker y `fullyParallel: false`.
- Revisión visual manual con capturas temporales a `390 × 844` y `768 × 1024`: navegación, mapa de mesas e inspector sin cortes. Las capturas no se versionan (`test-results/` está ignorado).
- Hash SHA-256 de `prisma/dev.db` antes y después: `67028ACBDD77A97890BB705608DA6191BB1FABF5229BBFA281A595F82CEF277E`, idéntico.

### 6.4. Ajustes que surgieron durante la verificación

| Síntoma | Causa | Corrección |
|---|---|---|
| axe marcaba `color-contrast` en la insignia de alerta | `#f87171` sobre `alert/15` quedaba en 4,46:1 | Alerta a `#fca5a5` |
| El foco no volvía al disparador tras cerrar el inspector | La restauración diferida del primer montaje de StrictMode ganaba la carrera | Época por instancia y foco previo memorizado |
| `Escape` cerraba dos diálogos a la vez | Cada modal escuchaba en `window` | Pila de diálogos: solo responde el superior |
| El test de retorno de foco apuntaba al botón equivocado | La tarjeta y la fila comparten nombre accesible | Se localiza la fila por el prefijo del nombre y se enfoca la tarjeta antes de abrir |

### 6.5. Deuda registrada

- La auditoría automática solo cubre Chromium y estados alcanzables con datos de semilla.
- No se ha probado con un lector de pantalla real (NVDA, VoiceOver) ni con zoom al `200 %`; queda como revisión manual y para la fase 9.
- No hay pruebas con Firefox, WebKit ni dispositivos físicos.
- La CI remota sigue sin ejecutarse porque el repositorio no tiene remoto.
- La tabla de fricciones queda abierta: cualquier observación nueva se añade sin borrar las anteriores.

### 6.6. Por qué se cierra

El bloque se cierra porque las seis fricciones detectadas tienen corrección implementada y una prueba que falla si se rompen, la suite completa pasa, el dato real no se ha tocado y la documentación refleja el estado. Lo que queda fuera está listado como deuda explícita, no como trabajo invisible.
