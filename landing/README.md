# NOCTUA — Landing pública

Landing de demostración para un restaurante de alta cocina y hotel boutique ficticio.
Estética **Dark Luxury**: negro/antracita, serif editorial, bronce y fotografía editorial.

## Estado actual

**Fase 1 — Diseño.** La landing es funcional como pieza de diseño, pero todavía **no está
conectada a ALFRED** y no persiste reservas.

- El formulario valida y simula una confirmación automática en el navegador.
- La simulación de tarjeta es únicamente visual: no hay red, ni cobro, ni almacenamiento de
  datos bancarios.
- Todo el punto de integración está aislado en `src/lib/reservations.ts`.

## Desarrollo

```bash
cd "Documents/portfolio 2/landing"
npm install
npm run dev
```

Abre `http://localhost:5174`.

```bash
npm run build     # typecheck + build de producción
npm run preview   # sirve el build
```

## Fase 2 — Integración con ALFRED

La landing **no tendrá lógica de reservas propia**. El único cambio será sustituir el cuerpo de
`createReservation()` por una llamada a la API pública de ALFRED:

```http
POST /api/public/reservas
```

Contrato previsto (alineado con `spec.md`, fase 7):

```json
{
  "clienteNombre": "Nombre Apellido",
  "numPersonas": 2,
  "fechaHora": "2026-11-14T21:00:00.000Z",
  "aceptaPolitica": true,
  "tarjetaSimulada": true
}
```

La reserva se guardará en la entidad `Reserva` de ALFRED y aparecerá en
`GET /api/reservas/mapa`. No se crea una segunda base de datos ni un segundo sistema.

### Pendiente en ALFRED

- Implementar el módulo de reservas (fase 7) y la ruta pública.
- Hacer opcional `clienteTelefono` (la landing solo pide nombre, personas, fecha y hora).
- Añadir `origen`, `tarjetaSimulada` y la relación `Reserva` ↔ `Servicio`.
- Implementar `GET /api/reservas/mapa`.
- Añadir el origen de la landing a `CORS_ORIGINS`.

## Datos de demostración

- Fecha mínima: hoy. Máxima: 120 días.
- Turnos: comida `13:00–14:30`, cena `20:00–22:00`.
- Tarjeta de prueba: `4242 4242 4242 4242`, caducidad futura, CVC de 3–4 dígitos.
- El número de localizador es simulado y no se guarda.

## Estructura

```text
landing/
  index.html
  src/
    App.tsx
    main.tsx
    styles.css
    components/
      Nav.tsx
      Hero.tsx
      Story.tsx
      Gastronomy.tsx
      Hotel.tsx
      Gallery.tsx
      Reservation.tsx
      CardSimulator.tsx
      Footer.tsx
      Reveal.tsx
    lib/
      images.ts
      reservations.ts   ← único punto de integración con ALFRED
```

Las imágenes son fotografías editoriales externas de Unsplash, cargadas por URL.
No se ha añadido ninguna dependencia fuera de React, Vite y TypeScript.
