import { AppConfigService } from '../../../../config/config.service';

/**
 * Convierte rutas relativas de multimedia (`/multimedia/files/...`) en URL absolutas
 * consumibles desde el navegador (img, background, etc.).
 */
export function resolveMultimediaPublicUrl(
  publicUrl: string | null | undefined,
  config: AppConfigService,
): string | null {
  const u = publicUrl?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;

  const base = (
    process.env.PUBLIC_API_BASE_URL?.trim() ||
    (config.isDevelopment() ? `http://localhost:${config.app.port}` : '')
  ).replace(/\/$/, '');

  if (!base) return u;

  const apiPrefix = config.app.apiPrefix.replace(/^\/+|\/+$/g, '');
  if (u.startsWith('/api/')) return `${base}${u}`;
  if (u.startsWith('/')) return `${base}/${apiPrefix}${u}`;
  return `${base}/${apiPrefix}/${u}`;
}
