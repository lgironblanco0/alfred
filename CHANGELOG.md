# Changelog — ALFRED

Todos los cambios relevantes del proyecto se registran aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado semántico: `MAYOR.MENOR.PARCHE`.

- **MAYOR:** cambios incompatibles o versión de producción.
- **MENOR:** funcionalidad nueva compatible.
- **PARCHE:** correcciones compatibles.

---

## [Unreleased]

Sin cambios pendientes.

---

## [0.4.0] - 2026-11-01

Cierre de la Fase 2: pruebas aisladas, E2E, contrato de API, observabilidad, accesibilidad y responsive.

### Added

- Accesibilidad y responsive (`docs/ACCESIBILIDAD.md`): diálogos con foco atrapado, `Escape` y devolución de foco; enlace de salto; `nav` con vista activa; feedback de guardado con regiones vivas; layout de una columna en móvil y tablet.
- 8 pruebas E2E de accesibilidad y responsive (`e2e/accesibilidad.spec.ts`): `axe-core` con WCAG A/AA, foco, etiquetas, objetivos táctiles y viewports de `390 × 844` y `768 × 1024`.
- `@axe-core/playwright` como dependencia de desarrollo.
- Hook `useModalFocus` para foco inicial, foco atrapado, pila de diálogos anidados y retorno al disparador.
- Reordenación de mesas con teclado mediante `KeyboardSensor` de dnd-kit.
- Base de datos desechable para pruebas (`docs/PRUEBAS-AISLADAS.md`): `npm test` crea, migra y siembra una SQLite temporal, y la borra al terminar.
- 3 pruebas de integración deterministas (`tests/integration.test.ts`): `409` al repetir mesa y actor en `APERTURA` y `PEDIDO`.
- Pruebas E2E con Playwright (`docs/E2E.md`): entrar, abrir mesa, añadir, enviar, marcar listo y cobrar como gerente; un camarero no puede cobrar.
- Contrato de API (`docs/API.md`): 21 rutas, permisos, formas de datos y 15 códigos de error.
- 12 pruebas de contrato (`tests/api-contract.test.ts`) que fijan el conjunto exacto de claves de las respuestas.
- Observabilidad (`docs/OBSERVABILIDAD.md`): logs JSON con redacción de campos sensibles, `userId` y `role` en el log de acceso, `GET /ready` con comprobación de base y pila solo fuera de producción.
- 9 pruebas de observabilidad (`tests/observability.test.ts`).

### Changed

- El layout pasa de una rejilla fija de `220px` a una columna por debajo de `1024px`; navegación y acciones se reorganizan en móvil.
- El inspector, la cuenta y las colas de Cocina/Barra/Caja se apilan y ajustan al ancho disponible.
- Los modales de login, walk-in, confirmación, inspector, cuenta y anulación usan semántica `dialog`, etiquetas asociadas y cierre con `Escape`.
- El color de alerta sube a `#fca5a5` y el texto sutil a `#9a9aa2` para cumplir contraste AA sobre los fondos del tema.
- Con puntero grueso, los controles principales miden al menos `44px`; los compactos, al menos `24px` con separación.
- `npm run test:e2e` acepta argumentos de Playwright, por ejemplo para ejecutar un solo archivo o un patrón.
- `login` y `/me` devuelven la misma forma de usuario, con `activo` y sin `passwordHash`.
- Nueva ruta pública `GET /ready`; `/health` sigue siendo liveness sin consultar la base.
- Los archivos de prueba se ejecutan en serie para evitar carreras al crear mesas.
- `prisma/schema.prisma` lee `DATABASE_URL`; `.env` pasa a ser necesario para arrancar.
- `npm test` usa una base temporal y ya no depende de `prisma/dev.db`.
- `npm run verify` incluye ahora las pruebas E2E.
- El proxy de Vite usa `ALFRED_API_URL`, y E2E levanta API en `3100` y web en `5180`.
- La integración continua instala Chromium antes de verificar.

### Verified

- `npm run verify` en verde: **99/99 pruebas** + **9 E2E**.
- 8 E2E nuevas de accesibilidad/responsive y el flujo de negocio original siguen en verde.
- `axe-core` no detecta violaciones WCAG A/AA en login, sala, inspector, cuenta, confirmación, walk-in, Cocina y Caja.
- Sin desbordamiento horizontal a `390px` ni a `768px`; inspector apilado en móvil.
- La suite completa se ejecutó tres veces seguidas en verde tras hacerla secuencial.
- `prisma/dev.db` conserva su hash SHA-256 tras `npm test` y tras `npm run verify`.
- Tag local `v0.4.0`. La CI remota sigue pendiente porque el repositorio no tiene remoto.

---

## [0.3.0] - 2026-10-27

Cierre de la Fase 1: backend protegido, auditoría por empleado y sesión endurecida.

### Added

- Sesión endurecida (`docs/SESION.md`): limitador de intentos con reloj inyectable, cabeceras de seguridad, `no-store` en autenticación y revocación al desactivar a un empleado.
- 13 pruebas nuevas de sesión y limitador (`tests/session.test.ts`, `tests/login-throttle.test.ts`).
- Empleados con código individual (`docs/EMPLEADOS.md`): cinco altas nuevas (un gerente, un encargado y tres camareros) y login por código único.
- 6 pruebas de códigos individuales en `tests/authz.test.ts`.
- Auditoría del actor (`docs/AUDITORIA.md`): eventos `PEDIDO`, `LISTO` y `SPLIT`, y `actor` en el contrato de lectura.
- Historial de movimientos visible en la cuenta del servicio, con hora y nombre del empleado.
- 4 pruebas unitarias de serialización (`tests/serialize.test.ts`).
- Matriz de permisos por rol (`docs/PERMISOS.md`) y protección de las 12 rutas de escritura del salón.
- Helper de autenticación para pruebas (`tests/helpers/auth.ts`) y 19 pruebas de autorización (`tests/authz.test.ts`).
- Recorrido guiado del backend (`docs/RECORRIDO-BACKEND.md`): flujo de `POST /api/servicios` de la petición a SQLite, con errores canónicos y deuda detectada.
- Contrato de errores y validación (`docs/ERRORES-Y-VALIDACION.md`) con 13 criterios de aceptación.
- 10 pruebas unitarias del manejador de errores (`tests/errors.test.ts`).
- Pruebas de contrato para `400`, `404`, `409`, `413` y `415` en `tests/api.test.ts`.

### Changed

- Todas las rutas de escritura del salón exigen token; solo `GET /api/sala` y el login quedan públicos.
- El frontend pide el código de empleado al arrancar: sin sesión no se puede operar.
- El cuerpo JSON ya no se coacciona: `pax: "2"`, `pax: true` y `pax: null` devuelven `400 VALIDATION_ERROR`.
- `POST /api/servicios` exige `mesaId` o `createTable` en el borde, con `path: "mesaId"`.
- La coerción de tipos queda solo en los parámetros de ruta.

### Verified

- `npm run verify` en verde: **75/75 pruebas**.
- Migración `20261027201000_usuario_codigo` aplicada con copia previa de la base de datos.

---

## [0.2.0] - 2026-10-27

Cierre de la Fase 0: fundación SDD, trazabilidad y verificación automática.

### Added

- Documento de Definition of Done (`docs/DEFINICION-DE-TERMINADO.md`).
- Plantilla oficial de bloque SDD (`docs/PLANTILLA-BLOQUE.md`).
- Estrategia de pruebas (`docs/ESTRATEGIA-DE-PRUEBAS.md`).
- Registro de cambios del proyecto (`CHANGELOG.md`).
- Favicon de ALFRED: A negra sobre fondo verde `#A3E635`.
- Comando único `npm run verify`.
- Workflow de integración continua en `.github/workflows/verify.yml`.

### Changed

- El color de tema del navegador se alinea con el fondo real (`#0D0D0D`).

### Verified

- `npm run verify` en verde: typecheck, builds y 15/15 tests.

---

## [0.1.0] - 2026-10-27

Primera línea base reproducible del MVP del salón.

### Added

- `README.md` con instalación, arranque, pruebas, backups y solución de problemas.
- `.env.example` como plantilla de variables de entorno.
- `docs/PLAN-SDD.md` con el plan de bloques y su estado de avance.
- `docs/TRAZABILIDAD.md` con 163 requisitos clasificados.
- Copia de seguridad de la base de datos con retención de 20 archivos.

### Changed

- Versión del backend y del frontend alineada a `0.1.0`.
- `.gitignore` permite versionar `.env.example` sin exponer `.env`.

### Removed

- `better-sqlite3` y `@prisma/adapter-better-sqlite3`, dependencias nativas que el código no usaba y que impedían la instalación limpia en Windows.

### Fixed

- Instalación desde cero verificada en una copia limpia: migraciones, seed, tests, builds y arranque.

### Verified

- `npm run typecheck`, `npm run build`, `npm --prefix web run build` y `npm test` (15/15).
- Clean-room completo con Node 24 y base de datos nueva.

---

## Historial anterior a la línea base

Antes de `0.1.0` se construyó el MVP funcional: salón, walk-in, unión de mesas, layout, comandas por asiento, Cocina, Barra, Caja, login por código, JWT, roles, copias de seguridad y repositorio git. No hubo changelog formal; esta entrada resume ese periodo.
