"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { getServerBackendApiBase } from "@/lib/backend-api-url";

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (newPassword.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: "La confirmación no coincide." };
  }

  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) {
    return { success: false, error: "No autenticado." };
  }

  try {
    const base = getServerBackendApiBase();
    const res = await fetch(`${base}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      const message =
        typeof json?.message === "string" && json.message.trim()
          ? json.message.trim()
          : Array.isArray(json?.message)
            ? json.message.map(String).join("; ")
            : `Error ${res.status}`;
      return { success: false, error: message };
    }

    // API puede devolver {success:true} o algo similar; si no hay error consideramos ok.
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al cambiar la contraseña" };
  }
}

