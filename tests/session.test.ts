import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

process.env.LOG_LEVEL = "silent";

let server: Server;
let baseUrl: string;
let prisma: (typeof import("../src/db.js"))["prisma"];
let config: (typeof import("../src/config.js"))["config"];
let signToken: (typeof import("../src/auth/tokens.js"))["signToken"];

before(async () => {
  const { app } = await import("../src/app.js");
  ({ prisma } = await import("../src/db.js"));
  ({ config } = await import("../src/config.js"));
  ({ signToken } = await import("../src/auth/tokens.js"));

  server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("No se pudo obtener el puerto de prueba");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.$disconnect();
});

async function me(token?: string) {
  return fetch(`${baseUrl}/api/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("caducidad y validez del token", () => {
  it("rechaza un token caducado con INVALID_TOKEN", async () => {
    const caducado = jwt.sign({}, config.jwtSecret, {
      algorithm: "HS256",
      subject: "1",
      expiresIn: -1,
    });

    const response = await me(caducado);

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_TOKEN");
  });

  it("rechaza un token manipulado", async () => {
    const token = signToken(1);
    const manipulado = `${token.slice(0, -2)}xx`;

    const response = await me(manipulado);

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_TOKEN");
  });

  it("exige la cabecera Bearer", async () => {
    const response = await me();

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "UNAUTHORIZED");
  });
});

describe("revocación por desactivación", () => {
  it("invalida el token en la siguiente petición", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const usuario = await prisma.usuario.create({
      data: {
        codigo: `tmp-${suffix}`,
        nombre: "Prueba de sesión",
        email: `sesion-${suffix}@alfred.local`,
        passwordHash: "no-se-usa-en-esta-prueba",
        rol: "CAMARERO",
      },
      select: { id: true },
    });

    try {
      const token = signToken(usuario.id);

      assert.equal((await me(token)).status, 200);

      await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });

      const response = await me(token);

      assert.equal(response.status, 401);
      assert.equal(((await response.json()) as { code: string }).code, "UNAUTHORIZED");
    } finally {
      await prisma.usuario.delete({ where: { id: usuario.id } });
    }
  });
});

describe("límite de intentos en el login", () => {
  it("bloquea tras cinco fallos del mismo código", async () => {
    const codigo = `fallo-${Math.random().toString(36).slice(2, 8)}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      assert.equal(response.status, 401);
    }

    const bloqueado = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });

    assert.equal(bloqueado.status, 429);
    assert.equal(((await bloqueado.json()) as { code: string }).code, "TOO_MANY_ATTEMPTS");
  });

  it("no bloquea códigos distintos desde el mismo origen", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: "999999" }),
    });

    assert.equal(response.status, 401);
    assert.equal(((await response.json()) as { code: string }).code, "INVALID_CREDENTIALS");
  });
});

describe("cabeceras de seguridad", () => {
  it("protege todas las respuestas", async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  it("prohíbe cachear las respuestas de autenticación", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: `cache-${Math.random().toString(36).slice(2, 8)}` }),
    });

    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});
