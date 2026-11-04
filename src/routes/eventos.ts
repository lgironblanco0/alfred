import { Router } from "express";

const clientes = new Set<NodeJS.WritableStream>();
export const eventosRouter = Router();

eventosRouter.get("/sse", (request, response) => {
  response.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  response.flushHeaders();
  response.write("event: connected\ndata: {}\n\n");
  clientes.add(response);
  const heartbeat = setInterval(() => response.write(`event: actualizacion\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`), 5000);
  request.on("close", () => { clearInterval(heartbeat); clientes.delete(response); });
});

export function emitirActualizacion(tipo = "actualizacion") {
  for (const cliente of clientes) cliente.write(`event: ${tipo}\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
}
