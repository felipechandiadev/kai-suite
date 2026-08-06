"use client";

import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { changePasswordAction } from "@/features/auth/actions/change-password.action";
import { clearKdsSession } from "@/lib/app-session";

const CHANGE_PASSWORD_FORM_ID = "kds-change-password-form";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  companyId: string;
};

export default function ChangePasswordDialog({
  isOpen,
  onClose,
  userId,
  companyId,
}: Props) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await changePasswordAction({
        userId,
        companyId,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleClose();
      clearKdsSession();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="Cambiar contraseña"
      size="custom"
      maxWidth="28rem"
      actionsJustify="between"
      data-test-id="change-password-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            onClick={handleClose}
            disabled={isLoading}
          >
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
      <form
        id={CHANGE_PASSWORD_FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <TextField
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setCurrentPassword(e.target.value)
          }
          required
          name="currentPassword"
          autoComplete="current-password"
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
          autoComplete="new-password"
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
          autoComplete="new-password"
        />
      </form>
    </Dialog>
  );
}
