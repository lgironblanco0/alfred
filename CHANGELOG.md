# Changelog — ALFRED

Todos los cambios relevantes del proyecto se registran aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado semántico: `MAYOR.MENOR.PARCHE`.

- **MAYOR:** cambios incompatibles o versión de producción.
- **MENOR:** funcionalidad nueva compatible.
- **PARCHE:** correcciones compatibles.

---

## [Unreleased]

### Added

- Documento de Definition of Done (`docs/DEFINICION-DE-TERMINADO.md`).
- Plantilla oficial de bloque SDD (`docs/PLANTILLA-BLOQUE.md`).
- Estrategia de pruebas (`docs/ESTRATEGIA-DE-PRUEBAS.md`).
- Registro de cambios del proyecto (`CHANGELOG.md`).
- Favicon de ALFRED: A negra sobre fondo verde `#A3E635`.

### Changed

- El color de tema del navegador se alinea con el fondo real (`#0D0D0D`).

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
