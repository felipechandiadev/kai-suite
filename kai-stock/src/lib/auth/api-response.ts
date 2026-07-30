export type ApiFailure = {
  success: false;
  error: string;
  unauthorized?: boolean;
};

export type ApiSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  success: true;
} & T;

export type ApiResult<T extends Record<string, unknown> = Record<string, never>> =
  | ApiSuccess<T>
  | ApiFailure;

export function parseApiErrorMessage(
  res: Response,
  data: Record<string, unknown>,
): string {
  const m = data.message;
  if (Array.isArray(m)) {
    return m.map(String).join("; ");
  }
  if (typeof m === "string" && m.trim()) {
    return m.trim();
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return res.statusText || "Error del servidor";
}

export function isUnauthorizedApi(res: Response, message?: string): boolean {
  if (res.status === 401) {
    return true;
  }
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("sesión inválida") ||
    lower.includes("sesion invalida") ||
    lower.includes("token de autenticación") ||
    lower.includes("token de autenticacion") ||
    lower.includes("no autorizado") ||
    lower.includes("unauthorized")
  );
}

export function apiFailure(res: Response, data: Record<string, unknown>): ApiFailure {
  const error = parseApiErrorMessage(res, data);
  return {
    success: false,
    error,
    unauthorized: isUnauthorizedApi(res, error),
  };
}
