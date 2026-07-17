export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (base) return base.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:5060";
  throw new Error("BACKEND_API_URL no está definida");
}

function apiUrl(path: string): string {
  return `${getServerBackendApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function parseCourierApiError(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return `Error del servidor (HTTP ${status})`;
  }
  try {
    const json = JSON.parse(trimmed) as { message?: string | string[] };
    const msg = json.message;
    if (typeof msg === "string" && msg.trim()) {
      return msg.trim();
    }
    if (Array.isArray(msg)) {
      const joined = msg.map(String).filter(Boolean).join(", ");
      if (joined) return joined;
    }
  } catch {
    // Respuesta no JSON: usar texto plano.
  }
  return trimmed;
}

export async function courierPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseCourierApiError(text, res.status));
  }
  return res.json() as Promise<T>;
}
