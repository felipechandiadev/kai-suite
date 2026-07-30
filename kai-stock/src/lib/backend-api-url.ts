export function getServerBackendApiBase(): string {
  const base =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
  if (!base) {
    throw new Error(
      "BACKEND_API_URL no está definida. En red local use la IP LAN del servidor, p. ej. http://192.168.1.10:5060",
    );
  }
  return base.replace(/\/$/, "");
}
