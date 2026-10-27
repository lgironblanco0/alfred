import assert from "node:assert/strict";

export async function login(baseUrl: string, codigo: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo }),
  });

  assert.equal(response.status, 200, `el login con el código ${codigo} debe funcionar`);

  const payload = (await response.json()) as { token: string };
  assert.ok(payload.token, "el login debe devolver un token");

  return payload.token;
}

export function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
