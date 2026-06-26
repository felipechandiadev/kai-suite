"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export async function getPresalesEnabledAction(): Promise<boolean> {
  const base = process.env.BACKEND_API_URL;
  if (!base) return false;
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string })?.activeCompanyId;
  if (!token || !activeCompanyId) return false;
  try {
    const res = await fetch(`${base}/api/company/presale-settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Active-Company-Id": activeCompanyId,
      },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      presaleSettings?: { enabled?: boolean };
    };
    return data.presaleSettings?.enabled === true;
  } catch {
    return false;
  }
}
