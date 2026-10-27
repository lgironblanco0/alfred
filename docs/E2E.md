# Pruebas de extremo a extremo — Bloque 2.2

Flujo real en un navegador: de abrir una mesa a cobrarla.

Escrito antes del código.

---

## 1. Qué aporta una prueba E2E

Las pruebas de integración hablan con la API. Una E2E habla con la **persona**: pulsa botones, espera a que la pantalla cambie y comprueba lo que ve.

| Nivel | Qué demuestra | Qué no ve |
|---|---|---|
| Unitaria | Una función aislada | La app |
| Integración | API + base de datos | La interfaz |
| **E2E** | **Navegador + interfaz + API + base** | Casos raros, rendimiento |

Una sola E2E bien elegida vale más que veinte frágiles. Aquí se prueba el recorrido que sostiene el negocio y el permiso que no debe fallar.

---

## 2. Decisiones

**Decisión E-1 — Playwright con Chromium.**
Playwright es el estándar actual para E2E en aplicaciones web, trae espera automática y permite depurar con traza. Solo se instala Chromium: añadir más navegadores multiplica el tiempo sin cubrir riesgos nuevos en una app interna.

**Decisión E-2 — Base desechable también para E2E.**
`npm run test:e2e` reutiliza el patrón del Bloque 2.1: crea una SQLite temporal, migra, siembra y la borra. El navegador nunca toca `dev.db`.

**Decisión E-3 — Puertos propios y proxy configurable.**
La API de E2E escucha en `3100` y Vite en `5180`. `web/vite.config.ts` lee `ALFRED_API_URL` para no chocar con el entorno de desarrollo. Así se puede trabajar con `npm run dev` mientras se ejecutan las pruebas.

**Decisión E-4 — Un flujo crítico y un permiso negativo.**
El flujo: entrar → abrir mesa → añadir producto → enviar pase → marcar listo → cobrar como gerente. El negativo: un camarero ve la caja en solo lectura y no puede cobrar. No se prueba cada pantalla.

**Decisión E-5 — Traza solo cuando falla.**
`trace: "on-first-retry"` y sin vídeo por defecto. En local no hay reintentos; en CI, dos.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | El login por código funciona en el navegador y muestra el nombre | `e2e/sala.spec.ts` |
| CA-2 | Elegir una mesa libre y añadir un producto abre el servicio | `e2e/sala.spec.ts` |
| CA-3 | Enviar el pase lo hace aparecer en Cocina o Barra | `e2e/sala.spec.ts` |
| CA-4 | Un camarero ve la caja en solo lectura y no puede cobrar | `e2e/sala.spec.ts` |
| CA-5 | Un gerente cobra y la mesa queda libre | `e2e/sala.spec.ts` |
| CA-6 | `npm run test:e2e` usa una base temporal y la borra | `scripts/e2e-with-db.mjs` |
| CA-7 | `npm run verify` incluye unitarias, integración y E2E | `package.json` |

---

## 4. Alcance

### Entra

- Playwright + Chromium.
- Configuración de dos servidores (API y Vite) con base temporal.
- Un flujo completo y el negativo de permisos.
- Integración en `npm run verify` y en el workflow de CI.

### No entra

| Tema | Fase |
|---|---|
| Safari, Firefox y móviles reales | 9 |
| Pruebas de accesibilidad automáticas | 2.5 |
| Carga y rendimiento | 11 |
| Capturas de pantalla en cada paso | No se prevé |

---

## 5. Definición de terminado

- [x] Especificación escrita.
- [x] Playwright instalado y Chromium disponible.
- [x] Configuración con dos servidores y base temporal.
- [x] Flujo completo en verde.
- [x] Permiso negativo en verde.
- [x] `npm run verify` incluye E2E.
- [x] CI actualizada con la instalación de Chromium.
- [x] Documento enlazado y plan actualizado.

### 5.1. Evidencia

```text
> e2e
Running 1 test using 1 worker
  ✓  1 e2e\sala.spec.ts:9:5 › de abrir una mesa a cobrarla, con el permiso correcto (3.1s)
  1 passed (11.1s)
```

El recorrido comprueba, en un Chromium real:

1. Ana (código `5`) entra y ve su nombre y su rol.
2. Elige una mesa libre y añade «Pan de cristal»; el servicio se abre solo.
3. Envía el pase y aparece en Cocina; se marca como listo.
4. En Caja ve «Solo lectura» y el botón «Sin permiso» deshabilitado.
5. Cierra sesión, entra como gerente (código `0`) y cobra.
6. La mesa vuelve a estar libre.

**Lecciones de implementación:**

- El inspector es un modal a pantalla completa; hay que cerrarlo antes de navegar por el menú.
- Los nombres accesibles repiten «Gerente» en la barra lateral y en Caja: conviene acotar por región (`complementary`).
- El puerto de Vite es configurable (`ALFRED_API_URL` y `--port`) para no chocar con otros proyectos abiertos.

---

## 6. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 2.2 | Especificación del flujo E2E y del permiso negativo |
| 2026-10-27 | 2.2 | Playwright, dos servidores con base temporal y un flujo completo en verde |
