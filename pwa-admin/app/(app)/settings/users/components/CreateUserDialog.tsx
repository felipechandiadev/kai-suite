"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createUserAction } from "@/features/settings-users/actions/user.action";
import { USER_ROLE_OPTIONS } from "@/features/settings-users/types/user.types";

const ROLE_OPTIONS: Option[] = USER_ROLE_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

export type CreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateUserDialog({ open, onClose, onSuccess }: CreateUserDialogProps) {
  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<string>("OPERATOR");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setUserName("");
    setMail("");
    setPassword("");
    setRol("OPERATOR");
    setError(null);
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createUserAction({
          userName: userName.trim(),
          mail: mail.trim(),
          password,
          rol: rol === "ADMIN" || rol === "OPERATOR" ? rol : "OPERATOR",
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear usuario"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="user-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="user-create-error">
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
            data-test-id="user-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!userName.trim() || !mail.trim() || !password || isPending}
            data-test-id="user-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Usuario"
          name="user-create-username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Usuario"
          required
          data-test-id="user-create-username"
        />
        <TextField
          label="Correo"
          name="user-create-mail"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          placeholder="Correo"
          type="email"
          autoComplete="off"
          required
          data-test-id="user-create-mail"
        />
        <TextField
          label="Contraseña"
          name="user-create-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          required
          data-test-id="user-create-password"
        />
        <div className="min-w-0">
          <Select
            label="Rol"
            name="user-create-rol"
            options={ROLE_OPTIONS}
            value={rol}
            onChange={(v) => setRol(v != null ? String(v) : "OPERATOR")}
            placeholder="Rol"
            required
            data-test-id="user-create-rol"
          />
        </div>
      </div>
    </Dialog>
  );
}
