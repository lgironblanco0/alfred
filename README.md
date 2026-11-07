# ALFRED

Aplicación de gestión para hostelería: salón, comandas por asiento, Cocina, Barra y Caja.

- **Backend:** Node.js + TypeScript + Express + Prisma + PostgreSQL.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS.
- **Acceso:** por código de empleado (gerente, encargado y camareros).

Esta es la versión `0.6.0`: sala, comandas, cocina, barra, caja, cobro completo, informes básicos y actualización en vivo mediante SSE. Se ejecuta como aplicación web responsive desde navegador.

### Demo en vivo

**https://alfred-3mz8.onrender.com**

Entra con el código de empleado `0` (gerente). Otros códigos de prueba: `1` (encargado) y `2` (camarero).

> El servicio está alojado en el **plan gratuito de Render**, que suspende la instancia cuando no recibe tráfico. La **primera visita puede tardar entre 30 y 60 segundos** en despertar; a partir de ahí responde con normalidad. Si la página parece no cargar, espera un momento y recarga.

### Despliegue

La aplicación está preparada para Render + PostgreSQL (Neon). `render.yaml` define un único servicio: el backend compila el frontend y sirve `web/dist` en producción.

- El servicio gratuito se suspende tras un periodo sin tráfico: la primera petición puede tardar entre 30 y 60 segundos (cold start).
- La base de datos debe ser PostgreSQL persistente; SQLite ya no está soportado.
- `render.yaml` carga los **datos de demostración** en cada despliegue (`ALFRED_ALLOW_DEMO_SEED=1`). El seed es idempotente, así que se puede repetir sin duplicar.
- Es una demo pública: los códigos `0`–`13` son de demostración y cualquiera puede entrar. **No introduzcas datos reales.**
- Para una instalación real, quita `ALFRED_ALLOW_DEMO_SEED` y crea el primer gerente con `npm run db:create-admin`.

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

Edita `.env` y ajusta, como mínimo, `DATABASE_URL` con tu PostgreSQL local. El archivo de ejemplo es:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/alfred?schema=public"
```

Prepara la base de datos y los datos iniciales:

```powershell
npm run db:deploy
npm run db:seed
```

- `db:deploy` aplica las migraciones existentes de `prisma/migrations`. Es el comando correcto para una base nueva.
- `db:migrate` solo se usa cuando cambias `schema.prisma` y necesitas **crear** una migración nueva.
- `db:seed` crea mesas, productos, promociones y los empleados `0`–`13`. Es idempotente y se niega a ejecutarse en producción.

La base de datos es PostgreSQL y su conexión se lee de `DATABASE_URL`. No se guarda ningún archivo de base dentro del repositorio.

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
| `0`, `3`, `8` | Gerente | Sí |
| `1`, `4`, `9` | Encargado | Sí |
| `2`, `5`–`7`, `10`–`13` | Camarero | No |

Los códigos `3`–`13` son individuales; el `2` sigue siendo el acceso compartido de camareros.

> **Importante:** en esta versión el inicio de sesión valida **solo el código de empleado**. La contraseña se guarda y se puede cambiar desde Gerencia, pero todavía no se pide al entrar. En la demo pública es intencionado: cualquiera puede probar con los códigos de la tabla. Para un uso real, crea un gerente con `npm run db:create-admin` y un código largo.

Gerencia solo aparece a gerente y encargado. Dentro de ella, **Empleados** es exclusivo del gerente; **Histórico** y **Caja** los ven ambos. El arqueo y el histórico se comprueban también en el servidor, no solo ocultando botones.

---

## 4. Comprobar que todo está bien

El comando único de verificación:

```powershell
npm run verify
```

Ejecuta, en orden:

1. Typecheck del backend.
2. Build del backend.
3. Build del frontend.
4. Pruebas automatizadas (unitarias e integración).
5. Pruebas E2E en Chromium: flujo completo, accesibilidad automática, foco y responsive.

Si algún paso falla, el comando se detiene y devuelve error. Es el mismo comando que usa la integración continua: cada push a `master` ejecuta `Verify` en GitHub Actions sobre el repositorio privado `lgironblanco0/alfred`.

También se pueden ejecutar por separado:

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | Comprueba tipos del backend sin generar archivos |
| `npm run build` | Compila el backend en `dist/` |
| `npm --prefix web run build` | Compila el frontend en `web/dist/` |
| `npm test` | Crea un schema temporal, lo migra y siembra, ejecuta `node:test` y lo borra |
| `npm run test:e2e` | Crea otro schema temporal y ejecuta Playwright en Chromium contra la app real |

Las pruebas cubren salud, errores canónicos, validación, autenticación, permisos, auditoría, códigos de empleado y sesión. Las E2E añaden el recorrido completo de sala, auditoría `axe-core` de accesibilidad, foco atrapado, `Escape`, etiquetas, objetivos táctiles y viewports de móvil y tablet. **No tocan los datos de desarrollo**: cada ejecución usa un schema PostgreSQL desechable (`scripts/test-with-db.mjs`). La primera vez hay que instalar Chromium:

```powershell
npx playwright install chromium
```

---

## 5. Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Backend en modo desarrollo con recarga |
| `npm run dev:web` | Frontend Vite en desarrollo |
| `npm run typecheck` | Typecheck del backend |
| `npm run build` | Build del backend |
| `npm run verify` | Typecheck + builds + tests + E2E |
| `npm start` | Ejecuta el backend compilado (`dist/src/server.js`) |
| `npm test` | Pruebas unitarias e integración con schema temporal |
| `npm run test:e2e` | Playwright: flujo completo con schema temporal |
| `npm run db:deploy` | Aplica las migraciones pendientes (desarrollo y producción) |
| `npm run db:migrate` | Crea y aplica una migración nueva en desarrollo |
| `npm run db:seed` | Datos de demostración; se bloquea en producción |
| `npm run db:create-admin` | Crea el primer gerente en una instalación nueva |

---

## 6. Primer administrador y copias de seguridad

### Crear el primer administrador

En una instalación nueva **no se ejecuta el seed**. Se crea un único gerente con un código largo:

```powershell
$env:ALFRED_ADMIN_CODIGO="un-codigo-largo-y-aleatorio"
$env:ALFRED_ADMIN_EMAIL="gerente@restaurante.com"
$env:ALFRED_ADMIN_NOMBRE="Nombre Apellido"
$env:ALFRED_ADMIN_PASSWORD="una-contraseña-de-8-o-mas"
npm run db:create-admin
```

El comando es idempotente: si el código ya existe, actualiza ese usuario. El código debe tener al menos 12 caracteres porque hoy es la única credencial de acceso.

### Copias de seguridad

PostgreSQL no se copia como un archivo. Opciones:

- **Local:** `pg_dump` (incluido en PostgreSQL, normalmente en `C:\Program Files\PostgreSQL\<versión>\bin`):
  ```powershell
  pg_dump "postgresql://postgres:CONTRASEÑA@localhost:5432/alfred" -Fc -f alfred.dump
  ```
- **Producción (Neon):** usa las copias y la recuperación a un punto en el tiempo del panel del proveedor.

> El antiguo `npm run db:backup` copiaba `prisma/dev.db`; se ha retirado porque SQLite ya no se usa.

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
| `DATABASE_URL` | Sí | — (ejemplo: `postgresql://postgres:clave@localhost:5432/alfred?schema=public`) | Conexión de Prisma a PostgreSQL |

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
│   └── src/components/   Sala, comanda, Cocina, Barra, Caja y Gerencia
├── prisma/               Esquema, migraciones y seed
├── tests/                Pruebas del backend
├── scripts/              Utilidades (pruebas aisladas, primer administrador)
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

**Error `P1001` o `P1012` al arrancar**
Prisma no puede conectar o no encuentra `DATABASE_URL`. Comprueba que PostgreSQL está arrancado y que la URL del `.env` tiene usuario, contraseña, puerto y nombre de base correctos. Valida con `npx prisma migrate status`.

---

## 10. Documentación

- `spec.md`: especificación funcional, dominio, API y criterios de aceptación.
- `plan.md`: plan de construcción, fases y decisiones de arquitectura.
- `CHANGELOG.md`: historial de cambios por versión.
- `docs/TEORIA-ALFRED.md`: teoría del proyecto explicada para aprender.
- `docs/TRAZABILIDAD.md`: matriz requisito → implementación → prueba → estado.
- `docs/DEFINICION-DE-TERMINADO.md`: qué significa que un bloque esté terminado.
- `docs/PLANTILLA-BLOQUE.md`: plantilla para especificar un bloque nuevo.
- `docs/ESTRATEGIA-DE-PRUEBAS.md`: niveles de prueba, base desechable y datos de prueba.
- `docs/ERRORES-Y-VALIDACION.md`: contrato de error y reglas de validación de la API.
- `docs/PERMISOS.md`: matriz de permisos por rol y protección de escrituras.
- `docs/AUDITORIA.md`: eventos por acción, contrato del actor y limitaciones.
- `docs/EMPLEADOS.md`: códigos individuales, plantilla y migración.
- `docs/SESION.md`: caducidad, límite de intentos, logout y cabeceras de seguridad.
- `docs/PRUEBAS-AISLADAS.md`: base desechable, seed y limpieza de las pruebas.
- `docs/E2E.md`: flujo completo en Playwright y permiso negativo de cobro.
- `docs/API.md`: contrato de las 21 rutas, permisos, formas de datos y errores.
- `docs/OBSERVABILIDAD.md`: logs, redacción de datos sensibles, health y readiness.
- `docs/ACCESIBILIDAD.md`: diálogos, foco, teclado, contraste, responsive y objetivos táctiles.
- `docs/PLAN-SDD.md`: plan de trabajo SDD por bloques y estado de avance.
