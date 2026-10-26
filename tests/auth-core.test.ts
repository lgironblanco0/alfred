import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { signToken, verifyToken } from "../src/auth/tokens";

describe("contraseñas", () => {
  it("genera un hash verificable y distinto en cada intento", async () => {
    const first = await hashPassword("ClaveSegura123");
    const second = await hashPassword("ClaveSegura123");

    assert.notEqual(first, second);
    assert.equal(await verifyPassword("ClaveSegura123", first), true);
    assert.equal(await verifyPassword("ClaveIncorrecta", first), false);
  });

  it("no guarda la contraseña en claro", async () => {
    const hash = await hashPassword("ClaveSegura123");

    assert.equal(hash.includes("ClaveSegura123"), false);
  });
});

describe("tokens JWT", () => {
  it("firma y verifica el identificador de usuario", () => {
    const token = signToken(42);

    assert.equal(verifyToken(token), 42);
  });

  it("rechaza un token manipulado", () => {
    const token = signToken(42);
    const tampered = `${token.slice(0, -2)}xx`;

    assert.throws(() => verifyToken(tampered));
  });

  it("rechaza un token con otro formato", () => {
    assert.throws(() => verifyToken("no-es-un-token"));
  });
});
