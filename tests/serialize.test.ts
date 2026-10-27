import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeServicio } from "../src/sala/serialize.js";

type ServicioSerializable = Parameters<typeof serializeServicio>[0];

function makeServicio(overrides: Partial<Record<string, unknown>> = {}): ServicioSerializable {
  return {
    id: 1,
    estado: "ABIERTA",
    pax: 2,
    origen: "WALK_IN",
    modoAsientos: "POR_ASIENTO",
    openedAt: new Date("2026-10-27T20:00:00.000Z"),
    closedAt: null,
    descuentoCodigo: null,
    descuentoTipo: null,
    descuentoValor: null,
    splitModo: "NINGUNO",
    mesas: [],
    lineas: [],
    eventos: [],
    ...overrides,
  } as unknown as ServicioSerializable;
}

const eventoBase = {
  id: 10,
  tipo: "ANULACION",
  detalle: "Se rompió la copa",
  createdAt: new Date("2026-10-27T20:14:00.000Z"),
};

describe("serialización del histórico", () => {
  it("expone el actor de un evento", () => {
    const servicio = makeServicio({
      eventos: [{ ...eventoBase, actorId: 3, actor: { id: 3, nombre: "Camareros" } }],
    });

    const [evento] = serializeServicio(servicio).eventos;

    assert.deepEqual(evento, {
      id: 10,
      tipo: "ANULACION",
      detalle: "Se rompió la copa",
      createdAt: "2026-10-27T20:14:00.000Z",
      actor: { id: 3, nombre: "Camareros" },
    });
  });

  it("devuelve actor nulo cuando el evento no lo tiene", () => {
    const servicio = makeServicio({ eventos: [{ ...eventoBase, actorId: null, actor: null }] });

    const [evento] = serializeServicio(servicio).eventos;

    assert.equal(evento.actor, null);
  });

  it("no inventa eventos cuando el servicio no tiene ninguno", () => {
    const servicio = makeServicio();

    assert.deepEqual(serializeServicio(servicio).eventos, []);
  });

  it("no filtra datos del empleado más allá del nombre", () => {
    const servicio = makeServicio({
      eventos: [
        {
          ...eventoBase,
          actorId: 3,
          actor: { id: 3, nombre: "Camareros", email: "2@alfred.local", rol: "CAMARERO" },
        },
      ],
    });

    const [evento] = serializeServicio(servicio).eventos;

    assert.deepEqual(evento.actor, { id: 3, nombre: "Camareros" });
  });
});
