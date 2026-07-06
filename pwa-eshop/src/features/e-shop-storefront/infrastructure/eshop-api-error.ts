export class EShopApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EShopApiError";
    this.status = status;
  }
}

/** `fetch` del servidor cuando el API Nest no está levantado o no es alcanzable. */
export function isEshopFetchNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError) || error.message !== "fetch failed") {
    return false;
  }
  const code = (error as { cause?: { code?: string } }).cause?.code;
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET";
}

export async function parseEshopErrorResponse(
  res: Response,
): Promise<EShopApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : `eShop API error ${res.status}`;
  return new EShopApiError(message, res.status);
}
