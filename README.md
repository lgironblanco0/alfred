# ALFRED

Aplicación de gestión para hostelería: salón, comandas por asiento, Cocina, Barra y Caja.

- **Backend:** Node.js + TypeScript + Express + Prisma + SQLite.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS.
- **Acceso:** por código de empleado (`0` Gerente, `1` Encargado, `2` Camareros).

Esta es la versión `0.1.0`: el MVP funcional del salón, no una versión de producción.

---

## 1. Requisitos

- **Node.js 20 o superior** (probado con Node 24).
- **npm 10 o superior**.
- Windows, macOS o Linux.

No hace falta instalar Prisma de forma global: viene en las dependencias del proyecto.

---

## 2. Instalación desde cero

En la raíz del proyecto:

```powershell
npm install
npm --prefix web install
```

Copia el archivo de variables de entorno:

```powershell
Copy-Item .env.example .env
```

Edita `.env` si quieres cambiar el puerto o el secreto JWT. En desarrollo puedes dejar los valores de ejemplo.

Prepara la base de datos y los datos iniciales:

```powershell
npm run db:migrate
npm run db:seed
```

- `db:migrate` aplica las migraciones de `prisma/migrations`.
- `db:seed` crea mesas, productos, promociones y los empleados `0`, `1` y `2`. Es idempotente: se puede ejecutar varias veces sin duplicar datos.

La base se guarda en `prisma/dev.db` y no se versiona en git.

---

## 3. Arrancar la aplicación

Hacen falta **dos terminales**.

**Terminal 1 — backend:**

```powershell
npm run dev
```

**Terminal 2 — frontend:**

```powershell
npm run dev:web
```

Abre exactamente:

**http://localhost:5173**

> Evita `http://127.0.0.1:5173`: Vite escucha en `localhost` (IPv6) y esa variante puede no responder.

Comprobación rápida del backend:

```powershell
Invoke-RestMethod http://localhost:3000/health
# { status: ok }
```

Vite redirige `/api` y `/health` al backend en el puerto `3000`, así que el navegador solo necesita el puerto `5173`.

### Códigos de acceso

| Código | Rol | Puede cobrar |
|---|---|---|
| `0` | Gerente | Sí |
| `1` | Encargado | Sí |
| `2` | Camareros | No |

En esta versión el código `2` es compartido por todos los camareros. La identificación individual llega en una fase posterior.

---

## 4. Comprobar que todo está bien

```powershell
npm run typecheck
npm run build
npm --prefix web run build
npm test
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | Comprueba tipos del backend sin generar archivos |
| `npm run build` | Compila el backend en `dist/` |
| `npm --prefix web run build` | Compila el frontend en `web/dist/` |
| `npm test` | Ejecuta las pruebas con `node:test` |

Las pruebas actuales cubren salud, errores canónicos, validación de entrada, contraseñas y tokens.

---

## 5. Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Backend en modo desarrollo con recarga |
| `npm run dev:web` | Frontend Vite en desarrollo |
| `npm run typecheck` | Typecheck del backend |
| `npm run build` | Build del backend |
| `npm start` | Ejecuta el backend compilado (`dist/src/server.js`) |
| `npm test` | Pruebas automatizadas |
| `npm run db:migrate` | Aplica migraciones en desarrollo |
| `npm run db:seed` | Datos iniciales idempotentes |
| `npm run db:backup` | Copia `prisma/dev.db` a `prisma/backups/` |

---

## 6. Copias de seguridad y restauración

Crear una copia:

```powershell
npm run db:backup
```

Se guarda en `prisma/backups/dev-AAAAMMDD-HHMMSS.db` y se conservan las últimas 20.

Restaurar una copia (con los servidores parados):

```powershell
Copy-Item "prisma/backups/dev-20261026-175832.db" "prisma/dev.db" -Force
```

> Haz siempre una copia antes de una migración o de una prueba destructiva.

---

## 7. Variables de entorno

El backend carga `.env` al arrancar (`src/config.ts`):

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `test` o `production` |
| `PORT` | No | `3000` | Puerto del backend |
| `JWT_SECRET` | En producción | Secreto de desarrollo | Firma de tokens; mínimo 32 caracteres |
| `JWT_EXPIRES_IN` | No | `8h` | Caducidad del token |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error`, `silent` |
| `CORS_ORIGINS` | No | Vacío | Orígenes permitidos, separados por comas |
| `DATABASE_URL` | No | `file:./dev.db` | Conexión de Prisma |

`.env` está ignorado por git. `.env.example` sí se versiona y sirve de plantilla.

---

## 8. Estructura del proyecto

```text
.
├── src/                  Backend Express + TypeScript
│   ├── routes/           Endpoints HTTP
│   ├── sala/             Reglas de negocio del salón
│   ├── middleware/       Autenticación y autorización
│   └── auth/             Contraseñas y tokens
├── web/                  Frontend React + Vite
│   └── src/components/   Sala, comanda, Cocina, Barra y Caja
├── prisma/               Esquema, migraciones, seed y base local
├── tests/                Pruebas del backend
├── scripts/              Utilidades (copia de seguridad)
├── docs/                 Documentación (teoría, plan SDD)
├── spec.md               Especificación funcional
└── plan.md               Plan, fases y ADRs
```

---

## 9. Problemas frecuentes

**La página no carga**
Comprueba que los dos servidores están levantados:

```powershell
Get-NetTCPConnection -LocalPort 3000,5173 -State Listen
```

**`EADDRINUSE`**
Ya hay un proceso usando el puerto. Ciérralo o cambia `PORT` en `.env` (y el proxy en `web/vite.config.ts`).

**Aviso `JWT_SECRET no configurado`**
Es normal en desarrollo si no has creado `.env`. En producción el backend se niega a arrancar sin un secreto de al menos 32 caracteres.

**La base de datos se corrompe o quieres empezar de cero**
Para de los servidores, haz copia y restaura una copia anterior. No borres `dev.db` sin copia previa.

---

## 10. Documentación

- `spec.md`: especificación funcional, dominio, API y criterios de aceptación.
- `plan.md`: plan de construcción, fases y decisiones de arquitectura.
- `docs/TEORIA-ALFRED.md`: teoría del proyecto explicada para aprender.
- `docs/PLAN-SDD.md`: plan de trabajo SDD por bloques y estado de avance.
