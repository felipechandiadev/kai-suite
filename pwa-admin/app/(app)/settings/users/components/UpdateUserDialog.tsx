"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { updateUserAction } from "@/features/settings-users/actions/user.action";
import type { UserListItem } from "@/features/settings-users/types/user.types";
import { USER_ROLE_OPTIONS } from "@/features/settings-users/types/user.types";
import { usePersonDocumentLookup } from "@/features/chile-person/ui/usePersonDocumentLookup";
import { PersonDocumentStatusAlert } from "@/features/chile-person/ui/PersonDocumentStatusAlert";

const ROLE_OPTIONS: Option[] = USER_ROLE_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

function displayRol(rol: string): string {
  if (rol === "ADMIN") return "ADMIN";
  if (rol === "OPERATOR") return "OPERATOR";
  if (rol === "COURIER") return "COURIER";
  if (rol === "USER" || rol === "MANAGER") return "OPERATOR";
  return "OPERATOR";
}

export type UpdateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  user: UserListItem;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateUserDialog({ open, onClose, user, onSuccess }: UpdateUserDialogProps) {
  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [rol, setRol] = useState("OPERATOR");
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [personDni, setPersonDni] = useState("");
  const [linkDocumentNumber, setLinkDocumentNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPerson = Boolean(user.personId || user.person?.id || user.person?.documentNumber);

  const personLabel = useMemo(() => {
    const p = [user.person?.firstName, user.person?.lastName]
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => String(x).trim());
    if (p.length > 0) return p.join(" ");
    return "";
  }, [user]);

  const linkLookup = usePersonDocumentLookup({
    documentNumber: linkDocumentNumber,
    intentRole: "user",
    enabled: open && !hasPerson,
  });

  useEffect(() => {
    if (!open) return;
    setUserName(user.userName);
    setMail(user.mail);
    setRol(displayRol(user.rol));
    setPersonName(personLabel);
    setPhone(user.person?.phone?.trim() ?? "");
    setPersonDni(user.person?.documentNumber?.trim() ?? "");
    setLinkDocumentNumber("");
    setError(null);
  }, [open, user, personLabel]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const linkPersonId =
          !hasPerson && linkLookup.kind === "reuse_readonly"
            ? linkLookup.person.id
            : undefined;
        if (!hasPerson && !linkPersonId) {
          setError("Vincule una persona existente por documento, o cree el usuario de nuevo con persona.");
          return;
        }
        if (linkLookup.kind === "conflict_same_role") {
          setError("Ese documento ya tiene un usuario de plataforma.");
          return;
        }
        const r = await updateUserAction({
          id: user.id,
          userName: userName.trim(),
          mail: mail.trim(),
          rol: rol === "ADMIN" || rol === "OPERATOR" || rol === "COURIER" ? rol : "OPERATOR",
          personName: hasPerson ? personName.trim() || null : null,
          phone: hasPerson ? phone.trim() || null : null,
          personDni: hasPerson ? personDni.trim() || null : null,
          personId: linkPersonId ?? null,
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

  const canSubmitFinal =
    !isPending &&
    Boolean(userName.trim()) &&
    Boolean(mail.trim()) &&
    (hasPerson || linkLookup.kind === "reuse_readonly") &&
    linkLookup.kind !== "conflict_same_role" &&
    linkLookup.kind !== "loading";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar usuario"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="user-update-dialog"
      alertArea={
        <div className="flex flex-col gap-2">
          {!hasPerson ? (
            <Alert variant="warning" data-test-id="user-update-no-person">
              Este usuario no tiene persona vinculada. Busque un documento existente para asociarlo.
            </Alert>
          ) : null}
          {!hasPerson ? (
            <PersonDocumentStatusAlert status={linkLookup} intentRole="user" />
          ) : null}
          {error ? (
            <Alert variant="error" data-test-id="user-update-error">
              {error}
            </Alert>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="user-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmitFinal}
            data-test-id="user-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Usuario"
          name="user-update-username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Usuario"
          required
          data-test-id="user-update-username"
        />
        <TextField
          label="Correo"
          name="user-update-mail"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          placeholder="Correo"
          type="email"
          required
          data-test-id="user-update-mail"
        />
        <div className="min-w-0">
          <Select
            label="Rol"
            name="user-update-rol"
            options={ROLE_OPTIONS}
            value={rol}
            onChange={(v) => setRol(v != null ? String(v) : "OPERATOR")}
            placeholder="Rol"
            required
            data-test-id="user-update-rol"
          />
        </div>
        {hasPerson ? (
          <>
            <TextField
              label="Nombre persona"
              name="user-update-person-name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Nombre persona"
              data-test-id="user-update-person-name"
            />
            <TextField
              label="Teléfono (opcional)"
              name="user-update-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              data-test-id="user-update-phone"
            />
            <TextField
              label="Documento"
              name="user-update-dni"
              value={personDni}
              onChange={(e) => setPersonDni(e.target.value)}
              placeholder="Documento"
              data-test-id="user-update-dni"
            />
          </>
        ) : (
          <TextField
            label="Documento para vincular persona"
            name="user-update-link-doc"
            value={linkDocumentNumber}
            onChange={(e) => setLinkDocumentNumber(e.target.value)}
            placeholder="RUT / pasaporte existente"
            required
            data-test-id="user-update-link-doc"
          />
        )}
      </div>
    </Dialog>
  );
}
