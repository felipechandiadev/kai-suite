function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

export async function fetchReceiptLogoBase64(
  logoUrl: string | null | undefined,
  origin: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const url = resolveReceiptLogoUrl(logoUrl, origin);
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}
