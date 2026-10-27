# Definition of Done — ALFRED

Este documento responde a una pregunta incómoda:

> ¿Cuándo podemos decir que un bloque está realmente terminado?

La respuesta no es “cuando funciona en mi pantalla”. Un bloque está terminado cuando hay **evidencia** de que cumple lo especificado y no ha roto lo anterior.

---

## 1. Diferencia entre criterio de aceptación y Definition of Done

- **Criterio de aceptación (CA):** qué debe hacer la funcionalidad. Es específico de cada bloque.
- **Definition of Done (DoD):** qué exige el proceso para considerar el trabajo cerrado. Es igual para todos los bloques.

Ejemplo:

- CA: “Un asiento fuera de rango devuelve 400”.
- DoD: “Existe una prueba automatizada que lo demuestra y `npm test` pasa”.

---

## 2. Checklist universal

Un bloque solo se marca ✅ cuando se cumplen **todos** estos puntos. Si alguno no aplica, se justifica por escrito.

### 2.1. Especificación

- [ ] El bloque tiene objetivo y contexto escritos.
- [ ] Referencia las secciones de `spec.md` que implementa.
- [ ] Tiene criterios de aceptación numerados (`CA-01`, `CA-02`...).
- [ ] Define qué queda **fuera de alcance**.
- [ ] Si cambia el contrato de API o el modelo de datos, está documentado antes de programar.

### 2.2. Pruebas

- [ ] Cada criterio de aceptación tiene una prueba automatizada o una justificación de por qué no puede tenerla.
- [ ] La prueba falla antes del cambio y pasa después (cuando es factible).
- [ ] Se cubre el camino feliz y al menos un caso de error.
- [ ] Las pruebas no dependen de datos de producción ni de `dev.db`.
- [ ] `npm test` pasa completo.

### 2.3. Verificación técnica

- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` pasa.
- [ ] `npm --prefix web run build` pasa.
- [ ] No hay errores nuevos en la consola del navegador.
- [ ] No se han roto flujos existentes (comprobación manual mínima).

> Hasta el Bloque 0.5 estos comandos se ejecutan por separado. Después se sustituyen por `npm run verify`.

### 2.4. Datos y seguridad

- [ ] Si hay migración, se hizo copia previa con `npm run db:backup`.
- [ ] La migración se probó sobre una base desechable, no sobre `dev.db`.
- [ ] Ninguna ruta nueva de escritura queda sin autenticación y autorización.
- [ ] No se registran contraseñas, tokens ni datos de pago.
- [ ] Los errores no filtran información interna.

### 2.5. Documentación

- [ ] `spec.md` refleja el comportamiento real (si cambió).
- [ ] `docs/TRAZABILIDAD.md` tiene las filas nuevas o actualizadas.
- [ ] `CHANGELOG.md` tiene la entrada correspondiente.
- [ ] Si hubo una decisión de arquitectura, está registrada como ADR.
- [ ] El plan SDD marca el bloque como ✅ con fecha, commit y verificación.

### 2.6. Git

- [ ] Los cambios están en un commit con mensaje claro.
- [ ] El repositorio queda limpio (`git status` sin cambios pendientes).
- [ ] El commit no mezcla varios bloques no relacionados.
- [ ] Si se cierra una fase, existe su tag (`v0.x.0`).

### 2.7. Comprensión

- [ ] Puedes explicar qué hace el bloque, por qué se hizo así y qué alternativas había.
- [ ] Sabes qué archivos tocó y qué prueba lo demuestra.
- [ ] Si no puedes explicarlo, el bloque no está terminado: como mucho, está copiado.

---

## 3. Evidencia mínima por tipo de bloque

| Tipo de bloque | Evidencia mínima |
|---|---|
| Documentación | Documento creado, enlazado y commit |
| Backend | Prueba de integración del endpoint + validación + permisos |
| Base de datos | Migración probada sobre copia + restauración verificada |
| Frontend | Build correcto + comprobación manual documentada |
| Seguridad | Prueba de 401, 403 y caso permitido |
| Infraestructura | Comando reproducible desde cero |
| Diseño / assets | Build + revisión visual + captura o descripción |

---

## 4. Estados permitidos

| Estado | Cuándo usarlo |
|---|---|
| ⬜ Pendiente | No se ha empezado |
| 🟨 En curso | Se está trabajando; aún no cumple la DoD |
| ✅ Hecho | Cumple toda la checklist aplicable |
| ⛔ Bloqueado | Falta una decisión, un acceso o un requisito |
| 🔁 Reabierto | Se descubrió un fallo o cambió el alcance |

**Regla:** una fila de la matriz solo pasa a ✅ si hay prueba automatizada. Una verificación manual se anota, pero no convierte la fila en ✅.

---

## 5. Excepciones justificadas

Hay bloques donde una prueba automatizada no aporta valor o no es viable todavía:

- Documentación pura.
- Assets visuales (favicon, iconos).
- Cambios de configuración de despliegue.
- Investigaciones técnicas sin código de producción.

En esos casos:

1. Se explica por qué no hay prueba automatizada.
2. Se documenta la verificación manual realizada.
3. Se anota como deuda técnica si debe cubrirse más adelante.

La excepción se escribe; no se supone.

---

## 6. Cambios de alcance

Un cambio de alcance no se implementa “de paso”. Se registra.

### 6.1. Cuándo es un cambio de alcance

- Se añade una funcionalidad que no estaba en la spec.
- Se elimina o aplaza algo especificado.
- Cambia el contrato de API.
- Cambia una regla de negocio.
- Cambia el modelo de datos de forma incompatible.

### 6.2. Procedimiento

1. **Registrar:** añadir una entrada en `plan.md` (sección de ADRs) o un ADR nuevo.
2. **Explicar:** contexto, decisión, alternativas y consecuencias.
3. **Actualizar:** `spec.md`, `docs/TRAZABILIDAD.md` y `CHANGELOG.md`.
4. **Aprobar:** confirmación explícita antes de implementar.
5. **Commit:** `docs(adr): ...` separado del código cuando sea posible.

### 6.3. Plantilla de ADR

```text
ADR-XXX — Título

Contexto:
  ¿Qué problema o necesidad aparece?

Decisión:
  ¿Qué se decide hacer?

Alternativas:
  ¿Qué otras opciones había y por qué se descartaron?

Consecuencias:
  ¿Qué mejora? ¿Qué coste o riesgo introduce?

Estado:
  Propuesto | Aceptado | Reemplazado por ADR-YYY
```

---

## 7. Registro de cierre de bloque

Al cerrar un bloque se añade esta ficha al final del documento del bloque o al registro del plan:

```text
Bloque: 0.0 — Nombre
Estado: ✅ Hecho
Fecha: AAAA-MM-DD
Commit: abc1234
Tag: v0.x.0 (si cierra fase)
CA cubiertos: CA-01, CA-02
Pruebas: ruta/al/test.test.ts
Verificación manual: qué se comprobó y cómo
Deuda pendiente: ninguna | descripción
Explicación: resumen en 5 frases
```

---

## 8. Revisión antes de abrir el siguiente bloque

Antes de pasar de fase, responder:

1. ¿Todos los CA del bloque están cubiertos?
2. ¿La matriz de trazabilidad está actualizada?
3. ¿El changelog refleja el cambio?
4. ¿Hay deuda técnica anotada?
5. ¿El repositorio está limpio y etiquetado si corresponde?
6. ¿Puedes explicar el bloque sin leer el código?

Si alguna respuesta es “no”, el bloque sigue abierto.
