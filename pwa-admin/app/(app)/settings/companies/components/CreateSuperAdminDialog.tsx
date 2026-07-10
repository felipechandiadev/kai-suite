"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { createSuperAdminAction } from "@/features/settings-users/actions/super-admin.action";

export type CreateSuperAdminDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateSuperAdminDialog({
  open,
  onClose,
  onSuccess,
}: CreateSuperAdminDialogProps) {
  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setUserName("");
    setMail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (isPending) return;
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createSuperAdminAction({
          userName: userName.trim(),
          mail: mail.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
        });
        if (r.success) {
          onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit =
    userName.trim().length >= 3 &&
    mail.trim().length > 0 &&
    password.length >= 6 &&
    firstName.trim().length > 0 &&
    !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Agregar super-administrador"
      size="md"
      scroll="paper"
      data-test-id="super-admin-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="super-admin-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="super-admin-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="super-admin-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Usuario (login)"
          name="super-admin-username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
          data-test-id="super-admin-create-username"
        />
        <TextField
          label="Email"
          name="super-admin-email"
          type="email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          required
          data-test-id="super-admin-create-email"
        />
        <TextField
          label="Contraseña"
          name="super-admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-test-id="super-admin-create-password"
        />
        <TextField
          label="Nombre"
          name="super-admin-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          data-test-id="super-admin-create-first-name"
        />
        <TextField
          label="Apellido (opcional)"
          name="super-admin-last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          data-test-id="super-admin-create-last-name"
        />
      </div>
    </Dialog>
  );
}
