import type { LoginResponse, Sala, Servicio, Usuario } from "./types";

const TOKEN_KEY = "alfred.token";

export function getToken(): string | null {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get requiresLogin(): boolean {
    return this.status === 401;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    message?: string;
  };
  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(
      response.status,
      payload.code ?? "ERROR",
      payload.message ?? payload.error ?? "No se pudo completar la acción",
    );
  }
  return payload;
}

export const api = {
  login: (codigo: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ codigo }),
    }),
  me: () => request<{ usuario: Usuario }>("/api/auth/me"),
  sala: () => request<Sala>("/api/sala"),
  walkIn: (body: Record<string, unknown>) =>
    request<Servicio>("/api/servicios", { method: "POST", body: JSON.stringify(body) }),
  expandPax: (id: number, pax: number) =>
    request<Servicio>(`/api/servicios/${id}/pax`, { method: "PATCH", body: JSON.stringify({ pax }) }),
  merge: (id: number, mesaIds: number[]) =>
    request<Servicio>(`/api/servicios/${id}/merge`, { method: "POST", body: JSON.stringify({ mesaIds }) }),
  cancel: (id: number, motivo: string) =>
    request<Servicio>(`/api/servicios/${id}/cancel`, { method: "POST", body: JSON.stringify({ motivo }) }),
  addItem: (id: number, body: Record<string, unknown>) =>
    request<Servicio>(`/api/servicios/${id}/items`, { method: "POST", body: JSON.stringify(body) }),
  call: (id: number) => request<Servicio>(`/api/servicios/${id}/call`, { method: "POST", body: "{}" }),
  ready: (lineaId: number) => request<Servicio>(`/api/lineas/${lineaId}/ready`, { method: "POST", body: "{}" }),
  anular: (lineaId: number, motivo: string) =>
    request<Servicio>(`/api/lineas/${lineaId}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }),
  promo: (id: number, codigo: string) =>
    request<Servicio>(`/api/servicios/${id}/promo`, { method: "POST", body: JSON.stringify({ codigo }) }),
  split: (id: number, splitModo: string) =>
    request<Servicio>(`/api/servicios/${id}/split`, { method: "POST", body: JSON.stringify({ splitModo }) }),
  pagar: (id: number) => request<Servicio>(`/api/servicios/${id}/pagar`, { method: "POST", body: "{}" }),
  layout: (items: Array<{ id: number; layoutOrder: number }>) =>
    request<Sala>("/api/mesas/layout", { method: "PATCH", body: JSON.stringify({ items }) }),
};
