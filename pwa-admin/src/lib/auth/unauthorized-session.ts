/**
 * Error y detección de sesión inválida / 401 del backend.
 * Seguro para importar desde Server Components y Client Components.
 */

export const UNAUTHORIZED_SESSION_CODE = "UNAUTHORIZED_SESSION" as const;

/** Mensaje estable (español) para UI y heurísticas. */
export const UNAUTHORIZED_SESSION_MESSAGE =
  "Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión.";

export class UnauthorizedSessionError extends Error {
  readonly code = UNAUTHORIZED_SESSION_CODE;

  constructor(message: string = UNAUTHORIZED_SESSION_MESSAGE) {
    super(message);
    this.name = "UnauthorizedSessionError";
  }
}

export function isUnauthorizedSessionError(error: unknown): boolean {
  if (error instanceof UnauthorizedSessionError) {
    return true;
  }
  if (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === UNAUTHORIZED_SESSION_CODE
  ) {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!message) {
    return false;
  }
  return isUnauthorizedErrorMessage(message);
}

/** Heurística sobre el texto del error (p. ej. JSON del filtro Nest o `HTTP 401`). */
export function isUnauthorizedErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("sesión inválida") ||
    lower.includes("sesion invalida") ||
    lower.includes("sesión expiró") ||
    lower.includes("sesion expiro") ||
    lower.includes("token de autenticación") ||
    lower.includes("token de autenticacion") ||
    lower.includes('"statuscode":401') ||
    lower.includes("statuscode\":401") ||
    lower.includes("statuscode: 401") ||
    lower.includes("statuscode:401") ||
    lower.includes('"status":401') ||
    lower.includes("http 401") ||
    lower.includes("unauthorized") ||
    lower.includes(UNAUTHORIZED_SESSION_CODE.toLowerCase())
  );
}

/** Lanza si la respuesta HTTP es 401. */
export function throwIfUnauthorizedStatus(status: number, detail?: string): void {
  if (status === 401) {
    throw new UnauthorizedSessionError(
      detail?.trim() ? detail.trim() : UNAUTHORIZED_SESSION_MESSAGE,
    );
  }
}
