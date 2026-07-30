import type { Company } from './company.entity';
import {
  type CompanyPublicContactSettings,
  sanitizeCompanyPublicContact,
} from './company-public-contact.types';

type CompanyContactSource = Pick<Company, 'mail' | 'phone' | 'settings'>;

/** Correo de contacto: `settings.publicContact.email` con fallback a columna legacy `mail`. */
export function resolveCompanyContactEmail(
  company: CompanyContactSource,
): string | null {
  const pc = sanitizeCompanyPublicContact(company.settings?.publicContact);
  return pc.email ?? company.mail?.trim() ?? null;
}

/** Teléfono de contacto: `settings.publicContact.phone` con fallback a columna legacy `phone`. */
export function resolveCompanyContactPhone(
  company: CompanyContactSource,
): string | null {
  const pc = sanitizeCompanyPublicContact(company.settings?.publicContact);
  return pc.phone ?? company.phone?.trim() ?? null;
}

/** Contacto público efectivo (eShop, admin, impresión vía {@link CompaniesService.toDetail}). */
export function resolveCompanyPublicContact(
  company: CompanyContactSource,
): CompanyPublicContactSettings {
  const raw = sanitizeCompanyPublicContact(company.settings?.publicContact);
  return {
    ...raw,
    email: raw.email ?? company.mail?.trim() ?? undefined,
    phone: raw.phone ?? company.phone?.trim() ?? undefined,
  };
}
