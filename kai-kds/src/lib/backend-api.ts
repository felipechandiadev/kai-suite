/**
 * Reescribe loopback solo en Node (server actions): preferir IPv4 estable.
 * En el browser NO forzar 127.0.0.1 — ver getClientBackendApiBase.
 */
export function preferIpv4Loopback(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "::1" || host === "[::1]") {
      url.hostname = "127.0.0.1";
      return url.origin;
    }
  } catch {
    // URL inválida
  }
  return trimmed;
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (base) return preferIpv4Loopback(base);
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:5030";
  throw new Error("BACKEND_API_URL no está definida");
}

/**
 * Base del API para el browser (WebSocket / fetch cliente).
 * Alinea loopback con el hostname de la página (evita localhost↔127.0.0.1).
 */
export function getClientBackendApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5030" : "");
  if (!raw) {
    throw new Error("NEXT_PUBLIC_BACKEND_API_URL no está definida");
  }
  let base = raw.replace(/\/$/, "");
  if (typeof window === "undefined") return preferIpv4Loopback(base);
  try {
    const url = new URL(base);
    if (isLoopbackHost(url.hostname)) {
      url.hostname = window.location.hostname;
      base = url.origin;
    }
  } catch {
    // URL inválida
  }
  return base;
}

export type DiningAuthContext = {
  userId: string;
  companyId: string;
};

export class KdsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "KdsApiError";
    this.status = status;
  }
}

function apiUrl(path: string): string {
  return `${getServerBackendApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function parseApiError(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `Error del servidor (HTTP ${status})`;
  try {
    const json = JSON.parse(trimmed) as { message?: string | string[] };
    const msg = json.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    if (Array.isArray(msg)) {
      const joined = msg.map(String).filter(Boolean).join(", ");
      if (joined) return joined;
    }
  } catch {
    // Respuesta no JSON.
  }
  return trimmed;
}

function throwApiError(text: string, status: number): never {
  throw new KdsApiError(parseApiError(text, status), status);
}

export function authHeaders(ctx: DiningAuthContext): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ctx.userId}`,
    "X-Active-Company-Id": ctx.companyId,
  };
}

export async function diningGet<T>(
  path: string,
  ctx: DiningAuthContext,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const url = new URL(apiUrl(path));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value?.trim()) url.searchParams.set(key, value.trim());
    }
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(ctx),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throwApiError(text, res.status);
  }
  return res.json() as Promise<T>;
}

export async function diningPost<T>(
  path: string,
  ctx: DiningAuthContext,
  body?: unknown,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: authHeaders(ctx),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throwApiError(text, res.status);
  }
  return res.json() as Promise<T>;
}

export async function diningLogin(body: {
  userName: string;
  password: string;
  companyId: string;
}): Promise<{
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
}> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Active-Company-Id": body.companyId,
    },
    body: JSON.stringify({
      userName: body.userName,
      password: body.password,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throwApiError(text, res.status);
  }
  const data = (await res.json()) as {
    user?: {
      id: string;
      userName: string;
      email: string;
      companyId: string | null;
      person?: { firstName?: string; lastName?: string };
    };
  };
  const user = data.user;
  if (!user?.id) throw new Error("Credenciales inválidas");
  const userCompanyId = user.companyId ?? body.companyId;
  if (userCompanyId !== body.companyId) {
    throw new Error("Este usuario no pertenece a la empresa configurada");
  }
  return {
    userId: user.id,
    companyId: userCompanyId,
    userName: user.userName,
    email: user.email ?? null,
    displayName:
      [user.person?.firstName, user.person?.lastName].filter(Boolean).join(" ") ||
      user.userName,
  };
}
