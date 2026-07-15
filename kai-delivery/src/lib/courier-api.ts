export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();

  if (base) return base.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:5030";
  throw new Error("BACKEND_API_URL no está definida");
}

function apiUrl(path: string): string {
  return `${getServerBackendApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
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
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
