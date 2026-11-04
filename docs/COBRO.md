# Cobro completo

La cuenta admite pagos parciales, pagos mixtos (efectivo y tarjeta), propina y cambio.

## Reglas

- Los importes se expresan en céntimos.
- `pagado` suma únicamente el importe de la cuenta; `propinaTotal` se informa por separado.
- El servicio solo pasa a `PAGADA` cuando el saldo llega a cero.
- `idempotencyKey` evita duplicar un pago si se reintenta la misma petición.
- Una devolución requiere rol `GERENTE`, importe y motivo, y queda registrada como evento.

## Endpoints

- `POST /api/servicios/:id/pagar`: cobro completo, parcial o mixto.
- `POST /api/servicios/:id/devolver`: devolución parcial o total.

El resumen de cuenta se puede imprimir desde el panel de Cuenta mediante el diálogo de impresión del navegador.
