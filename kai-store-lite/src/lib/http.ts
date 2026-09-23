import { coreBaseUrl } from "@/config/app.config";
import { getToken } from "./auth-token";
import { ApiError } from "./errors";

export type FetchOpts = RequestInit & { skipAuth?: boolean };

export async function coreFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!opts.skipAuth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${coreBaseUrl()}${path}`, { ...opts, headers });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const offline =
      /load failed|failed to fetch|networkerror|network request failed|econnrefused/i.test(
        raw,
      );
    throw new ApiError(
      offline
        ? "No se pudo conectar con el Core. Esperá un momento o reiniciá la app."
        : raw || "Error de red",
      0,
    );
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
