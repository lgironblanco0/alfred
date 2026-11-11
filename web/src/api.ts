import type {
  Caja,
  Empleado,
  HistoricoPage,
  LoginResponse,
  MetodoPago,
  Sala,
  Servicio,
  SesionCaja,
  Usuario,
  InventarioItem,
} from "./types";

type Informe = import("./types").Informe;

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
  inventario: () => request<{ items: InventarioItem[] }>("/api/inventario"),
  solicitarInventario: (items: Array<{ itemId: number; cantidad: number }>) =>
    request("/api/inventario/solicitudes", { method: "POST", body: JSON.stringify({ items }) }),
  reponerInventario: (id: number, cantidad: number) =>
    request<InventarioItem>(`/api/inventario/${id}/reponer`, { method: "POST", body: JSON.stringify({ cantidad }) }),
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
  pagar: (
    id: number,
    body: {
      metodoPago?: MetodoPago;
      efectivoEntregado?: number;
      importe?: number;
      propina?: number;
      concepto?: string;
      pagos?: Array<{
        metodoPago: MetodoPago;
        importe: number;
        propina?: number;
        recibido?: number;
        concepto?: string;
      }>;
      idempotencyKey?: string;
    },
  ) =>
    request<Servicio>(`/api/servicios/${id}/pagar`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  devolver: (id: number, importe: number, motivo: string) =>
    request<Servicio>(`/api/servicios/${id}/devolver`, { method: "POST", body: JSON.stringify({ importe, motivo }) }),
  layout: (items: Array<{ id: number; layoutOrder: number }>) =>
    request<Sala>("/api/mesas/layout", { method: "PATCH", body: JSON.stringify({ items }) }),
  empleados: () => request<{ usuarios: Empleado[] }>("/api/usuarios"),
  crearEmpleado: (body: {
    codigo: string;
    nombre: string;
    email: string;
    password: string;
    rol: string;
  }) => request<{ usuario: Empleado }>("/api/usuarios", { method: "POST", body: JSON.stringify(body) }),
  actualizarEmpleado: (id: number, body: { activo?: boolean; rol?: string; nombre?: string }) =>
    request<{ usuario: Empleado }>(`/api/usuarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  historico: (params: { desde?: string; hasta?: string; estado?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    return request<HistoricoPage>(`/api/historico?${query.toString()}`);
  },
  caja: () => request<Caja>("/api/caja"),
  informes: (dias = 30) => request<Informe>(`/api/informes?dias=${dias}`),
  abrirCaja: (fondoInicial: number) =>
    request<{ sesion: SesionCaja }>("/api/caja/abrir", {
      method: "POST",
      body: JSON.stringify({ fondoInicial }),
    }),
  cerrarCaja: (efectivoContado: number, notas?: string) =>
    request<{ sesion: SesionCaja }>("/api/caja/cerrar", {
      method: "POST",
      body: JSON.stringify({ efectivoContado, notas }),
    }),
  sesionesCaja: (limit = 10) =>
    request<{ sesiones: SesionCaja[] }>(`/api/caja/sesiones?limit=${limit}`),
};
