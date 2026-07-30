import { apiUrl, getBackendHeaders } from "@/shared/auth/backend-fetch";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const { transactionId } = await params;
  const id = transactionId?.trim();
  if (!id) {
    return Response.json({ message: "Transacción inválida" }, { status: 400 });
  }

  const headers = await getBackendHeaders();
  const res = await fetch(apiUrl(`transactions/${encodeURIComponent(id)}`), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : `HTTP ${res.status}`;
    return Response.json({ message: msg }, { status: res.status });
  }

  return Response.json(json, { status: 200 });
}

