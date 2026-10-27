# Plantilla de bloque SDD — ALFRED

Copia esta plantilla al empezar un bloque nuevo. Rellena todas las secciones antes de programar. Si una sección no aplica, escribe “No aplica” y el motivo.

---

# Bloque X.Y — Título corto

**Estado:** ⬜ Pendiente · 🟨 En curso · ✅ Hecho
**Fecha de inicio:** AAAA-MM-DD
**Rama:** `fase-X/bloque-Y-descripcion`
**Commit de cierre:** pendiente
**Tag:** pendiente (solo si cierra fase)

---

## 1. Contexto

¿Por qué existe este bloque? ¿Qué problema resuelve? ¿Qué pasa hoy si no se hace?

---

## 2. Objetivo

Una frase clara y verificable.

> Ejemplo: “Permitir que solo ENCARGADO y GERENTE puedan cobrar una cuenta.”

---

## 3. Referencias

- `spec.md` §X.Y
- `docs/TRAZABILIDAD.md` IDs: `XXX-01`, `XXX-02`
- ADR relacionado: ADR-XXX (si existe)
- Bloques previos de los que depende: X.Y

---

## 4. Fuera de alcance

Lo que **no** se hará en este bloque, para evitar que crezca:

- ...
- ...

---

## 5. Criterios de aceptación

| ID | Criterio | Cómo se verifica |
|---|---|---|
| CA-01 | ... | Prueba automatizada / manual |
| CA-02 | ... | Prueba automatizada / manual |

Regla: cada criterio debe poder responderse con “sí” o “no”. Evita verbos vagos como “mejorar” o “optimizar”.

---

## 6. Contrato

### 6.1. API (si aplica)

| Método | Ruta | Permiso | Entrada | Salida | Errores |
|---|---|---|---|---|---|
| GET | `/api/...` | ... | ... | ... | 400, 401, 403, 404 |

### 6.2. Datos (si aplica)

- Entidades afectadas:
- Campos nuevos:
- Invariantes:
- Migración necesaria: sí / no

### 6.3. Interfaz (si aplica)

- Pantallas o componentes:
- Estados: cargando, vacío, error, éxito.
- Comportamiento en móvil/tablet.

---

## 7. Pruebas previstas

| Nivel | Qué se prueba | Archivo |
|---|---|---|
| Unitaria | ... | `tests/...` |
| Integración | ... | `tests/...` |
| E2E | ... | `tests/e2e/...` |
| Manual | ... | pasos concretos |

Antes de implementar, escribe al menos una prueba que falle (si es viable).

---

## 8. Riesgos y rollback

- Riesgo principal:
- Cómo se detecta:
- Cómo se revierte:
- ¿Afecta datos? → copia previa obligatoria con `npm run db:backup`.

---

## 9. Definition of Done

- [ ] Criterios de aceptación cubiertos.
- [ ] Pruebas automatizadas o justificación de excepción.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` pasa.
- [ ] `npm --prefix web run build` pasa.
- [ ] `npm test` pasa.
- [ ] Sin regresiones en flujos existentes.
- [ ] `spec.md`, `docs/TRAZABILIDAD.md` y `CHANGELOG.md` actualizados.
- [ ] Commit con mensaje claro.
- [ ] Repositorio limpio.
- [ ] Explicación en 5 frases.

Checklist completa: `docs/DEFINICION-DE-TERMINADO.md`.

---

## 10. Explicación del bloque

Al terminar, escribe con tus palabras:

1. Qué hace el bloque.
2. Qué archivos toca y por qué.
3. Qué prueba lo demuestra.
4. Qué alternativa se descartó.
5. Qué aprendiste de backend.

---

## 11. Registro de cierre

```text
Bloque: X.Y — Nombre
Estado: ✅ Hecho
Fecha: AAAA-MM-DD
Commit: abc1234
CA cubiertos: CA-01, CA-02
Pruebas: ruta/al/test.test.ts
Verificación manual: ...
Deuda pendiente: ...
```

---

## 12. Notas para el aprendiz

- Si no entiendes una capa, para y pregunta antes de copiar código.
- Si una prueba falla, no la borres: entiende por qué falla.
- Si el bloque crece, divídelo. Un bloque debe caber en una sesión de trabajo.
- Si algo no se puede explicar, todavía no está terminado.
