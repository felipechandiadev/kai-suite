"use client";

import { useState } from "react";
import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";

const CHANGE_PASSWORD_FORM_ID = "change-password-form";

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const accessToken = (session?.user as { accessToken?: string } | undefined)?.accessToken;
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
        process.env.BACKEND_API_URL?.trim() ||
        "http://localhost:3001";
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? ""}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al cambiar la contraseña");
      }

      onClose();
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Cambiar contraseña"
      size="custom"
      maxWidth="28rem"
      actionsJustify="between"
      data-test-id="change-password-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={CHANGE_PASSWORD_FORM_ID}
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? "Cambiando…" : "Cambiar contraseña"}
          </Button>
        </>
      }
    >
      <form id={CHANGE_PASSWORD_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setCurrentPassword(e.target.value)
          }
          required
          name="currentPassword"
        />

        <TextField
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setNewPassword(e.target.value)
          }
          required
          name="newPassword"
        />

        <TextField
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setConfirmPassword(e.target.value)
          }
          required
          name="confirmPassword"
        />
      </form>
    </Dialog>
  );
}
