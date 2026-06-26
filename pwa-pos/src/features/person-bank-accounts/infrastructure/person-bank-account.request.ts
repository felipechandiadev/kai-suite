import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { normalizePersonBankAccounts } from "../lib/normalize-person-bank-accounts";
import type {
  AddPersonBankAccountInput,
  PersonBankAccountItem,
} from "../types/person-bank-account.types";

function apiUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null })?.activeCompanyId;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    h["X-Active-Company-Id"] = activeCompanyId;
  }
  return h;
}

async function errorBodyMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as Record<string, unknown>;
    const m = data.message;
    if (Array.isArray(m)) {
      return m.map((x) => String(x)).join("; ");
    }
    if (typeof m === "string" && m.trim()) {
      return m.trim();
    }
  } catch {
    // ignore
  }
  return `Error HTTP ${res.status}`;
}

export class PersonBankAccountRequest {
  static async list(personId: string): Promise<PersonBankAccountItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`persons/${encodeURIComponent(personId)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
    const json = (await res.json()) as { person?: { bankAccounts?: unknown } };
    return normalizePersonBankAccounts(json.person?.bankAccounts);
  }

  static async add(
    personId: string,
    input: AddPersonBankAccountInput,
  ): Promise<PersonBankAccountItem[]> {
    const headers = await authHeaders();
    const res = await fetch(apiUrl(`persons/${encodeURIComponent(personId)}/bank-accounts`), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(await errorBodyMessage(res));
    }
    const json = (await res.json()) as { person?: { bankAccounts?: unknown } };
    return normalizePersonBankAccounts(json.person?.bankAccounts);
  }
}
