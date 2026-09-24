import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import type { AuthUser, LiteRole } from "@/providers/AuthProvider";

const FORM_ID = "lite-user-account-password-form";

const ROLE_LABEL: Record<LiteRole | string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  SUB_ADMIN: "Subadministrador",
  CASHIER: "Cajero",
  POS_OPERATOR: "Cajero",
  STOCK: "Inventario",
  STOCK_OPERATOR: "Inventario",
};

export type UserAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  user: AuthUser;
  /** Tras cambiar contraseña: cerrar sesión. */
  onPasswordChanged: () => void;
};

export function UserAccountDialog({
  open,
  onClose,
  user,
  onPasswordChanged,
}: UserAccountDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await liteFetch("/lite/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      onClose();
      onPasswordChanged();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mi cuenta"
      size="custom"
      maxWidth="42rem"
      data-test-id="user-account-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={busy}>
            Cerrar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={busy}
            data-test-id="user-account-change-password-submit"
          >
            Cambiar contraseña
          </Button>
        </>
      }
    >
      <div className="flex min-h-[14rem] w-full flex-col gap-4 sm:flex-row sm:gap-0">
        {/* Izquierda: cambio de contraseña */}
        <div className="min-w-0 flex-1 sm:pr-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Cambiar contraseña
          </h3>
          <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <TextField
              label="Contraseña actual"
              placeholder="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <TextField
              label="Nueva contraseña"
              placeholder="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <TextField
              label="Confirmar contraseña"
              placeholder="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Al cambiar la contraseña se cerrará la sesión y deberás iniciar sesión de nuevo.
            </p>
          </form>
        </div>

        {/* Derecha: info usuario (máx. 40%) */}
        <aside
          className="w-full shrink-0 border-t border-border pt-4 sm:w-[40%] sm:max-w-[40%] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
          data-test-id="user-account-sidebar"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">Usuario</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nombre
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Email
              </dt>
              <dd className="mt-0.5 break-all text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Roles
              </dt>
              <dd className="mt-0.5 text-foreground">
                {user.roles
                  .map((r) => ROLE_LABEL[r] ?? ROLE_LABEL[r.toUpperCase()] ?? r)
                  .join(", ")}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </Dialog>
  );
}
