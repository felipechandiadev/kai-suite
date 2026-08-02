export type CompanyMenuFindUsSettings = {
  title: string;
  address: string;
  phone: string;
  hours: string;
  mapLat: number | null;
  mapLng: number | null;
};

export function buildDefaultCompanyMenuFindUsSettings(): CompanyMenuFindUsSettings {
  return {
    title: 'Encuéntranos',
    address: '',
    phone: '',
    hours: 'Lun–Dom 12:00–23:00',
    mapLat: null,
    mapLng: null,
  };
}

export function sanitizeCompanyMenuFindUsSettings(
  raw: unknown,
): CompanyMenuFindUsSettings {
  const defaults = buildDefaultCompanyMenuFindUsSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const o = raw as Record<string, unknown>;
  const parseCoord = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    title:
      typeof o.title === 'string' && o.title.trim()
        ? o.title.trim().slice(0, 120)
        : defaults.title,
    address:
      typeof o.address === 'string' ? o.address.trim().slice(0, 500) : defaults.address,
    phone:
      typeof o.phone === 'string' ? o.phone.trim().slice(0, 40) : defaults.phone,
    hours:
      typeof o.hours === 'string' ? o.hours.trim().slice(0, 200) : defaults.hours,
    mapLat: parseCoord(o.mapLat),
    mapLng: parseCoord(o.mapLng),
  };
}

export function resolveMenuFindUs(
  settings: Record<string, unknown> | null | undefined,
): CompanyMenuFindUsSettings {
  return sanitizeCompanyMenuFindUsSettings(settings?.menuFindUs);
}
