"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

function apiUrl(path: string) {
  const base = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) throw new Error("BACKEND_API_URL no configurada");
  return `${base}/api/${path.replace(/^\//, "")}`;
}

async function authHeaders(companyId: string) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) throw new Error("No autenticado");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Active-Company-Id": companyId,
  };
}

export async function getMenuAboutAction(companyId: string) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-about`), {
    headers: await authHeaders(companyId),
    cache: "no-store",
  });
  const data = await res.json();
  return data.about ?? data.resolved;
}

export async function saveMenuAboutAction(
  companyId: string,
  body: { title: string; body: string },
) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-about`), {
    method: "PATCH",
    headers: await authHeaders(companyId),
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function getMenuFindUsAction(companyId: string) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-find-us`), {
    headers: await authHeaders(companyId),
    cache: "no-store",
  });
  const data = await res.json();
  return data.findUs ?? data.resolved;
}

export async function saveMenuFindUsAction(
  companyId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-find-us`), {
    method: "PATCH",
    headers: await authHeaders(companyId),
    body: JSON.stringify(body),
  });
  return res.ok;
}

export async function getMenuThemeAction(companyId: string) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-theme`), {
    headers: await authHeaders(companyId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No se pudo cargar el tema de la carta");
  const data = await res.json();
  return {
    theme: data.theme,
    resolved: data.resolved,
    presets: data.presets ?? [],
  };
}

export async function saveMenuThemeAction(
  companyId: string,
  body: {
    templateId: string;
    tokenOverrides?: Record<string, string>;
    themeTokenOverrides?: Record<string, string>;
  },
) {
  const payload = {
    templateId: body.templateId,
    tokenOverrides: body.tokenOverrides ?? body.themeTokenOverrides ?? {},
  };
  const res = await fetch(apiUrl(`companies/${companyId}/menu-theme`), {
    method: "PATCH",
    headers: await authHeaders(companyId),
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function getMenuTopBarAction(companyId: string) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-topbar`), {
    headers: await authHeaders(companyId),
    cache: "no-store",
  });
  const data = await res.json();
  return data.topBar ?? data.resolved;
}

export async function saveMenuTopBarAction(companyId: string, body: Record<string, unknown>) {
  const res = await fetch(apiUrl(`companies/${companyId}/menu-topbar`), {
    method: "PATCH",
    headers: await authHeaders(companyId),
    body: JSON.stringify(body),
  });
  return res.ok;
}
