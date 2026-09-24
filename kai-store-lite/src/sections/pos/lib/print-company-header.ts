import { liteFetch } from "@/lib/lite-client";
import type { LiteCompanyPayload } from "@/lib/lite-api";

export type LitePrintCompanyHeader = {
  name?: string;
  rut?: string;
  address?: string;
  commune?: string;
  city?: string;
  phone?: string;
};

export async function fetchPrintCompanyHeader(): Promise<LitePrintCompanyHeader | undefined> {
  try {
    const data = await liteFetch<LiteCompanyPayload>("/lite/company");
    const c = data.company;
    if (!c) return undefined;
    const name =
      c.nombreFantasia?.trim() || c.razonSocial?.trim() || c.name?.trim() || undefined;
    return {
      ...(name ? { name } : {}),
      ...(c.rut?.trim() ? { rut: c.rut.trim() } : {}),
      ...(c.address?.trim() ? { address: c.address.trim() } : {}),
      ...(c.commune?.trim() ? { commune: c.commune.trim() } : {}),
      ...(c.city?.trim() ? { city: c.city.trim() } : {}),
      ...(c.phone?.trim() ? { phone: c.phone.trim() } : {}),
    };
  } catch {
    return undefined;
  }
}
