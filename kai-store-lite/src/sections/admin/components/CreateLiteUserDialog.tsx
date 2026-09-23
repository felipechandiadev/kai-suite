import { useEffect, useState } from "react";
import { Alert, Button, Dialog, Select, TextField } from "@kai/ui";
import { coreFetch } from "@/lib/http";
import { toUserMessage } from "@/lib/errors";
import type { LiteUser } from "@/lib/lite-api";

const ROLE_OPTIONS = [
  { id: "ADMIN", label: "Administrador" },
  { id: "POS_OPERATOR", label: "Cajero" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (user: LiteUser) => void;
};

export function CreateLiteUserDialog({ open, onClose, onCreated }: Props) {
  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("POS_OPERATOR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserName("");
    setMail("");
    setPassword("");
    setRole("POS_OPERATOR");
    setFirstName("");
    setLastName("");
    setError(null);
  }, [open]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const user = await coreFetch<LiteUser>("/lite/users", {
        method: "POST",
        body: JSON.stringify({
          userName: userName.trim(),
          mail: mail.trim(),
          password,
          role,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });
      onCreated(user);
      onClose();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    userName.trim().length >= 3 &&
    mail.trim().includes("@") &&
    password.length >= 6;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Crear usuario"
      actions={
        <>
          <Button type="button" variant="outlined" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            Crear
          </Button>
        </>
      }
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      data-test-id="create-lite-user-dialog"
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Usuario"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          autoComplete="off"
          data-test-id="create-user-username"
        />
        <TextField
          label="Email"
          type="email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          autoComplete="off"
          data-test-id="create-user-email"
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          data-test-id="create-user-password"
        />
        <Select
          label="Rol"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(id) => setRole(String(id ?? "POS_OPERATOR"))}
          data-test-id="create-user-role"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre (opcional)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Apellido (opcional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  );
}
