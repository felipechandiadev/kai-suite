import os from "node:os";

/**
 * Orígenes permitidos en `next dev` para acceder desde la red local (tablets, otros PCs).
 * Next.js no aplica comodines de dominio a IPs (p. ej. `192.168.*` no matchea `192.168.0.193`).
 */
function hostnameFromEnvUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** IPv4 no loopback de las interfaces de red de esta máquina (host del dev server en LAN). */
function localLanIpv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const addresses = new Set<string>();
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      const family = net.family === "IPv4" || net.family === 4;
      if (family && !net.internal) {
        addresses.add(net.address);
      }
    }
  }
  return [...addresses];
}

/** Lista para `allowedDevOrigins` en next.config (dev, red local). */
export function buildLanAllowedDevOrigins(): string[] {
  const extra =
    process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const fromNextAuth = hostnameFromEnvUrl(process.env.NEXTAUTH_URL);
  const fromPublicApp = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_APP_URL);
  const fromBackend = hostnameFromEnvUrl(process.env.BACKEND_API_URL);
  const fromPublicBackend = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_BACKEND_API_URL);

  const hosts = [
    ...localLanIpv4Addresses(),
    ...extra,
    ...(fromNextAuth ? [fromNextAuth] : []),
    ...(fromPublicApp ? [fromPublicApp] : []),
    ...(fromBackend ? [fromBackend] : []),
    ...(fromPublicBackend ? [fromPublicBackend] : []),
  ];

  return [...new Set(hosts.map((h) => h.toLowerCase()))];
}
