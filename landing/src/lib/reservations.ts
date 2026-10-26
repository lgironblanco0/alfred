// Punto único de integración con ALFRED.
// Fase 1 (diseño): devuelve una confirmación simulada y no persiste nada.
// Fase 2: sustituir el cuerpo por:
//
//   const response = await fetch(`${import.meta.env.VITE_ALFRED_API_URL}/api/public/reservas`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(input),
//   });
//   if (!response.ok) throw new Error(...);
//   return response.json();
//
// Los datos de la tarjeta NUNCA forman parte de ReservationInput.

export type ReservationInput = {
  nombre: string;
  personas: number;
  fecha: string;
  hora: string;
  tarjetaSimulada: boolean;
  aceptaPolitica: boolean;
};

export type ReservationConfirmation = {
  codigo: string;
  estado: "CONFIRMADA";
  nombre: string;
  personas: number;
  fecha: string;
  hora: string;
  tarjetaSimulada: boolean;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function confirmationCode(input: ReservationInput): string {
  const seed = `${input.nombre}${input.fecha}${input.hora}${input.personas}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `NCT-${hash.toString(36).toUpperCase().slice(0, 4).padEnd(4, "0")}`;
}

export async function createReservation(input: ReservationInput): Promise<ReservationConfirmation> {
  // Simulación local de la respuesta de ALFRED. Sin red, sin persistencia.
  await wait(900);

  return {
    codigo: confirmationCode(input),
    estado: "CONFIRMADA",
    nombre: input.nombre,
    personas: input.personas,
    fecha: input.fecha,
    hora: input.hora,
    tarjetaSimulada: input.tarjetaSimulada,
  };
}
