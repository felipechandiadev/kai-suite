export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (base) return base.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:5030";
  throw new Error("BACKEND_API_URL no está definida");
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
