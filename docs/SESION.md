# Sesión y endurecimiento — Bloque 1.6

Qué protege la sesión de ALFRED, qué riesgos quedan aceptados y cómo se comprueban.

Escrito antes del código.

---

## 1. Punto de partida

Tras 1.5 cada empleado tiene su código y cada petición de escritura exige token. Pero una sesión segura no es solo "tener token":

| Pieza | Estado antes de 1.6 |
|---|---|
| Caducidad del token | Configurada (`8h`) sin prueba |
| Revocación al desactivar a un empleado | Funciona (se comprueba `activo` en cada petición), sin prueba |
| Logout | Borra el token del navegador, pero deja al usuario en una pantalla sin sesión |
| Límite de intentos | Implementado en la ruta, sin prueba y sin reloj inyectable |
| Cabeceras de seguridad | Ausentes |
| Tamaño de cuerpo | Limitado a `100kb` y probado |
| CORS | Restringido por entorno, sin prueba |

---

## 2. Modelo mental

**El token es una pulsera de acceso, no una sesión en el servidor.**

```text
POST /api/auth/login   →  token firmado (HS256), 8 h, sujeto = id de usuario
Cada petición          →  Bearer token  →  firma y caducidad  →  usuario en BD  →  activo
```

Como el servidor no guarda sesiones, hay dos consecuencias que conviene entender:

1. **Logout no puede "borrar" el token en el servidor.** El cliente lo descarta; si alguien copió el token antes, seguirá siendo válido hasta su caducidad.
2. **La revocación real existe, pero es por empleado, no por sesión.** `requireAuth` consulta `Usuario.activo` en cada petición (decisión D-9). Desactivar a un empleado invalida **todos** sus tokens de inmediato.

**Decisión S-1 — Logout es del cliente; la revocación real es desactivar al empleado.**
No se añade una tabla de sesiones ni una lista de revocación en 1.6: sería complejidad real (almacenamiento, limpieza, consulta por petición) para un riesgo que ya mitiga la caducidad de 8 h y la desactivación. Queda como deuda para la fase 4, cuando haya que revocar un token robado sin despedir a la persona.

**Decisión S-2 — No hay PIN en 1.6.**
El código de empleado es una credencial de baja fricción, pensada para un dispositivo compartido en sala. Añadir PIN ahora obligaría a decidir política de recuperación, cambios y bloqueos, y rompería el acceso de demostración. El riesgo —quien conozca el código `0` entra como gerente— se acepta conscientemente y se compensa con límite de intentos, caducidad, permisos por rol y auditoría del actor. El PIN entra en la fase 4 junto con la revocación por sesión.

**Decisión S-3 — El límite de intentos se mide por `ip + código`.**
Limitar solo por IP castigaría a todo el local cuando alguien se equivoca; limitar solo por código permitiría bloquear a un compañero desde otra máquina. La combinación permite cinco fallos por código y origen cada 15 minutos. Un login correcto limpia el contador.

**Decisión S-4 — Cabeceras de seguridad propias, sin dependencia nueva.**
La API solo devuelve JSON. Un middleware pequeño con `nosniff`, `DENY` de frames, `Referrer-Policy`, `Permissions-Policy`, CSP `default-src 'none'` y `Cache-Control: no-store` en `/api/auth` cubre lo necesario sin añadir `helmet`. HSTS solo en producción, porque en local se sirve por HTTP.

**Decisión S-5 — CORS se revisa, no se amplía.**
Si `CORS_ORIGINS` está definido, solo esos orígenes pueden llamar. En producción sin lista, CORS queda cerrado (`origin: false`). En desarrollo, sin lista, se permite cualquier origen para no estorbar a Vite y a las pruebas. Es una comodidad local, no una configuración de producción: al desplegar hay que definir `CORS_ORIGINS`.

---

## 3. Criterios de aceptación

| ID | Criterio | Prueba |
|---|---|---|
| CA-1 | Un token caducado se rechaza con `401 INVALID_TOKEN` | `tests/auth-core.test.ts` + `tests/session.test.ts` |
| CA-2 | Un token manipulado o sin `Bearer` se rechaza con `401` | `tests/session.test.ts` |
| CA-3 | Desactivar a un empleado invalida su token en la siguiente petición | `tests/session.test.ts` |
| CA-4 | Tras cinco fallos, el siguiente intento con el mismo `ip + código` devuelve `429 TOO_MANY_ATTEMPTS` | `tests/login-throttle.test.ts` + `tests/session.test.ts` |
| CA-5 | Un login correcto limpia el contador de fallos | `tests/login-throttle.test.ts` |
| CA-6 | La ventana de 15 minutos se reinicia sola | `tests/login-throttle.test.ts` |
| CA-7 | Toda respuesta lleva cabeceras de seguridad y `/api/auth` no se cachea | `tests/session.test.ts` |
| CA-8 | Un cuerpo de más de `100kb` devuelve `413 PAYLOAD_TOO_LARGE` | `tests/api.test.ts` (ya existente) |
| CA-9 | Al caducar o cerrar sesión, la interfaz vuelve al login | Manual + revisión |

**Fuera del alcance de las pruebas automáticas:** el punto CA-9 es de interfaz; se verifica manualmente y por revisión, porque no hay navegador automatizado hasta la fase 2.

---

## 4. Cambios previstos

1. Extraer el limitador a `src/auth/loginThrottle.ts` con reloj inyectable.
2. Añadir `src/middleware/securityHeaders.ts` y montarlo en `app.ts`.
3. Corregir el frontend: logout y token caducado abren el modal de login.
4. Pruebas nuevas: unitarias del limitador, integración de sesión y cabeceras.
5. Documentar en `docs/SESION.md` y actualizar README, CHANGELOG y plan.

---

## 5. Definición de terminado

- [x] Especificación escrita.
- [x] Limitador extraído y probado con reloj falso.
- [x] Cabeceras de seguridad montadas y probadas.
- [x] Revocación por desactivación probada contra la API.
- [x] Frontend vuelve al login al cerrar sesión o caducar.
- [x] `npm run verify` en verde.
- [x] Documento enlazado y plan actualizado.

### 5.1. Evidencia

- `src/auth/loginThrottle.ts`: limitador con reloj inyectable, `prune()` y contador por clave.
- `src/middleware/securityHeaders.ts`: cabeceras base, HSTS en producción y `no-store` en `/api/auth`.
- `tests/login-throttle.test.ts`: 5 pruebas (bloqueo, claves independientes, caducidad, reinicio por éxito y limpieza).
- `tests/session.test.ts`: 8 pruebas de integración (caducado, manipulado, sin Bearer, desactivación, 429, cabeceras y caché).
- Frontend: logout y token caducado abren el modal de login.
- **75/75 pruebas en verde.**

**Verificación manual pendiente:**

1. Entra con el código `2`; pulsa **Cerrar sesión**. Debe aparecer el modal de login.
2. Cambia `JWT_EXPIRES_IN=1s` en `.env`, reinicia el servidor, entra y espera. La siguiente acción debe devolver al login.
3. Falla cinco veces con un código inventado: el sexto intento debe responder `429`.

---

## 6. Historial

| Fecha | Bloque | Cambio |
|---|---|---|
| 2026-10-27 | 1.6 | Especificación de sesión, límite de intentos y cabeceras |
| 2026-10-27 | 1.6 | Limitador inyectable, cabeceras de seguridad, revocación probada y retorno al login |
