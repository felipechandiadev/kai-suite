"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createUserAction } from "@/features/settings-users/actions/user.action";
import { USER_ROLE_OPTIONS } from "@/features/settings-users/types/user.types";
import { usePersonDocumentLookup } from "@/features/chile-person/ui/usePersonDocumentLookup";
import { PersonDocumentStatusAlert } from "@/features/chile-person/ui/PersonDocumentStatusAlert";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

const ROLE_OPTIONS: Option[] = USER_ROLE_OPTIONS.map((o) => ({ id: o.id, label: o.label }));

const DOC_OPTIONS: Option[] = [
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
];

const EMPLOYMENT_TYPE_OPTIONS: Option[] = [
  { id: "FULL_TIME", label: "Jornada completa" },
  { id: "PART_TIME", label: "Part time" },
  { id: "CONTRACTOR", label: "Contratista" },
  { id: "TEMPORARY", label: "Temporal" },
  { id: "INTERN", label: "Práctica" },
];

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type CreateUserDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  branches?: BranchListItem[];
};

export function CreateUserDialog({
  open,
  onClose,
  onSuccess,
  branches = [],
}: CreateUserDialogProps) {
  const [userName, setUserName] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<string>("POS_OPERATOR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUT" | "PASSPORT" | "OTHER">("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [alsoAsEmployee, setAlsoAsEmployee] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [hireDate, setHireDate] = useState(todayIsoDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const docLookup = usePersonDocumentLookup({
    documentNumber,
    documentType,
    intentRole: "user",
    enabled: open,
  });
  const personReadOnly = docLookup.kind === "reuse_readonly";
  const linkedPersonId = docLookup.kind === "reuse_readonly" ? docLookup.person.id : null;
  const alreadyEmployee =
    docLookup.kind === "reuse_readonly" && Boolean(docLookup.roles.employee);

  const branchOptions: Option[] = useMemo(
    () =>
      branches
        .filter((b) => b.isActive !== false)
        .map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  useEffect(() => {
    if (docLookup.kind !== "reuse_readonly") return;
    const p = docLookup.person;
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setDocumentType((p.documentType as "RUT" | "PASSPORT" | "OTHER") || "RUT");
    setDocumentNumber(p.documentNumber ?? "");
    setPhone(p.phone ?? "");
    if (p.email) setMail((prev) => prev || p.email || "");
    if (docLookup.roles.employee) setAlsoAsEmployee(false);
  }, [docLookup]);

  useEffect(() => {
    if (!open) return;
    setUserName("");
    setMail("");
    setPassword("");
    setRol("POS_OPERATOR");
    setFirstName("");
    setLastName("");
    setDocumentType("RUT");
    setDocumentNumber("");
    setPhone("");
    setAlsoAsEmployee(false);
    setBranchId(null);
    setEmploymentType("FULL_TIME");
    setHireDate(todayIsoDate());
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
          rol:
            rol === "ADMIN" ||
            rol === "POS_OPERATOR" ||
            rol === "COURIER" ||
            rol === "SUB_ADMIN" ||
            rol === "WAITER" ||
            rol === "STOCK_OPERATOR" ||
            rol === "KDS_OPERATOR"
              ? rol
              : "POS_OPERATOR",
          ...(linkedPersonId
            ? { personId: linkedPersonId }
            : {
                person: {
                  firstName: firstName.trim(),
                  lastName: lastName.trim() || undefined,
                  documentType,
                  documentNumber: documentNumber.trim(),
                  email: mail.trim() || undefined,
                  phone: phone.trim() || undefined,
                },
              }),
          alsoAsEmployee:
            alsoAsEmployee && !alreadyEmployee
              ? {
                  branchId: branchId || undefined,
                  employmentType,
                  hireDate: hireDate.trim(),
                }
              : undefined,
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

  const canSubmit =
    !isPending &&
    docLookup.kind !== "conflict_same_role" &&
    docLookup.kind !== "loading" &&
    docLookup.kind !== "error" &&
    userName.trim().length >= 3 &&
    mail.trim().length > 0 &&
    password.length >= 6 &&
    documentNumber.trim().length > 0 &&
    (personReadOnly || firstName.trim().length > 0) &&
    (!alsoAsEmployee || alreadyEmployee || hireDate.trim().length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear usuario"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="user-create-dialog"
      alertArea={
        <div className="flex flex-col gap-2">
          <PersonDocumentStatusAlert status={docLookup} intentRole="user" />
          {error ? (
            <Alert variant="error" data-test-id="user-create-error">
              {error}
            </Alert>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
            Crear usuario
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          El usuario de plataforma requiere una persona natural con documento de identidad.
        </p>

        <Select
          label="Tipo de documento"
          name="user-doc-type"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(v) =>
            setDocumentType((v != null ? String(v) : "RUT") as "RUT" | "PASSPORT" | "OTHER")
          }
          disabled={personReadOnly || isPending}
          required
        />
        <TextField
          label="Número de documento"
          name="user-document-number"
          type={documentType === "RUT" ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-create-document"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={personReadOnly || isPending}
          />
          <TextField
            label="Apellidos (opcional)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={personReadOnly || isPending}
          />
        </div>
        <TextField
          label="Teléfono (opcional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={personReadOnly || isPending}
        />

        <p className="text-sm font-semibold text-foreground">Acceso</p>
        <TextField
          label="Usuario"
          name="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-create-username"
        />
        <TextField
          label="Correo"
          name="mail"
          type="email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-create-mail"
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isPending}
          data-test-id="user-create-password"
        />
        <Select
          label="Rol"
          name="rol"
          options={ROLE_OPTIONS}
          value={rol}
          onChange={(v) => setRol(v != null ? String(v) : "POS_OPERATOR")}
          disabled={isPending}
          data-test-id="user-create-rol"
        />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={alsoAsEmployee && !alreadyEmployee}
            disabled={alreadyEmployee || isPending}
            onChange={(e) => setAlsoAsEmployee(e.target.checked)}
            data-test-id="user-create-also-employee"
          />
          También registrar como empleado
        </label>
        {alreadyEmployee ? (
          <p className="text-sm text-muted-foreground">Esta persona ya es empleado.</p>
        ) : null}
        {alsoAsEmployee && !alreadyEmployee ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <Select
              label="Sucursal (opcional)"
              name="user-emp-branch"
              options={branchOptions}
              value={branchId}
              onChange={(v) => setBranchId(v != null ? String(v) : null)}
              disabled={isPending}
            />
            <Select
              label="Tipo de contrato"
              name="user-emp-type"
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={employmentType}
              onChange={(v) => setEmploymentType(v != null ? String(v) : "FULL_TIME")}
              disabled={isPending}
            />
            <TextField
              label="Fecha de ingreso"
              name="user-emp-hire"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
