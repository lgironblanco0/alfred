# Maison Aurelia — landing estática

Landing responsive en HTML, CSS y JavaScript puro.

## Ejecutar
1. Descomprime el ZIP.
2. Abre `index.html` en tu navegador, o abre la carpeta en VS Code y utiliza Live Server.
3. Las fuentes y fotos remotas necesitan conexión a Internet.

## Funcionalidades
- Estética Dark Luxury responsive.
- Menú móvil.
- Menú gastronómico interactivo que cambia texto e imagen.
- Los botones de reserva muestran un aviso de que la conexión con MesaGrid está pendiente.
- Newsletter de demostración con validación del navegador.

## Aún no conectado
No crea reservas, no llama a la API de MesaGrid, no cobra ni recoge datos de tarjetas. El newsletter tampoco envía ni almacena correos.

## Próxima integración
Cuando definamos el endpoint del backend de MesaGrid, podemos convertir los botones de reserva en un formulario con nombre, número de personas, fecha y hora. El navegador debe comunicarse con el backend; nunca debe conectarse directamente a la base de datos.
