"use server";

import {
  authHeaders,
  getServerBackendApiBase,
  type DiningAuthContext,
} from "@/lib/backend-api";

function apiUrl(path: string): string {
  return `${getServerBackendApiBase()}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function parseApiError(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `Error del servidor (HTTP ${status})`;
  try {
    const json = JSON.parse(trimmed) as { message?: string | string[] };
    const msg = json.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    if (Array.isArray(msg)) {
      const joined = msg.map(String).filter(Boolean).join(", ");
      if (joined) return joined;
    }
  } catch {
    // non-JSON
  }
  return trimmed;
}

export async function changePasswordAction(input: {
  userId: string;
  companyId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const currentPassword =
    typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword =
    typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (newPassword.length < 6) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: "La confirmación no coincide." };
  }
  if (!input.userId.trim() || !input.companyId.trim()) {
    return { success: false, error: "No autenticado." };
  }

  const ctx: DiningAuthContext = {
    userId: input.userId.trim(),
    companyId: input.companyId.trim(),
  };

  try {
    const res = await fetch(apiUrl("/auth/change-password"), {
      method: "POST",
      headers: authHeaders(ctx),
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: parseApiError(text, res.status) };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof Error ? e.message : "Error al cambiar la contraseña",
    };
  }
}
