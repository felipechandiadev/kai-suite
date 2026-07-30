"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createEmployeeAction } from "@/features/hr-employees/actions/employee.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { usePersonDocumentLookup } from "@/features/chile-person/ui/usePersonDocumentLookup";
import { PersonDocumentStatusAlert } from "@/features/chile-person/ui/PersonDocumentStatusAlert";
import { USER_ROLE_OPTIONS } from "@/features/settings-users/types/user.types";

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

export type CreateEmployeeDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CreateEmployeeDialog({
  open,
  onClose,
  onSuccess,
  branches,
  laborUnits = [],
}: CreateEmployeeDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUT" | "PASSPORT" | "OTHER">("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [laborUnitId, setLaborUnitId] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [hireDate, setHireDate] = useState(todayIsoDate);
  const [baseSalary, setBaseSalary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [alsoAsUser, setAlsoAsUser] = useState(false);
  const [userName, setUserName] = useState("");
  const [userMail, setUserMail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRol, setUserRol] = useState("POS_OPERATOR");

  const docLookup = usePersonDocumentLookup({
    documentNumber,
    documentType,
    intentRole: "employee",
    enabled: open,
  });
  const personReadOnly = docLookup.kind === "reuse_readonly";
  const linkedPersonId = docLookup.kind === "reuse_readonly" ? docLookup.person.id : null;
  const alreadyUser = docLookup.kind === "reuse_readonly" && Boolean(docLookup.roles.user);

  useEffect(() => {
    if (docLookup.kind !== "reuse_readonly") return;
    const p = docLookup.person;
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setDocumentType((p.documentType as "RUT" | "PASSPORT" | "OTHER") || "RUT");
    setDocumentNumber(p.documentNumber ?? "");
    setEmail(p.email ?? "");
    setPhone(p.phone ?? "");
    if (docLookup.roles.user) {
      setAlsoAsUser(false);
    }
  }, [docLookup]);

  const branchOptions: Option[] = useMemo(
    () =>
      branches
        .filter((b) => b.isActive !== false)
        .map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const laborUnitOptions: Option[] = useMemo(
    () =>
      laborUnits.map((u) => ({
        id: u.id,
        label: u.code ? `${u.name} (${u.code})` : u.name,
      })),
    [laborUnits],
  );

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setDocumentType("RUT");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setBranchId(null);
      setLaborUnitId(null);
      setEmploymentType("FULL_TIME");
      setHireDate(todayIsoDate());
      setBaseSalary("");
      setAlsoAsUser(false);
      setUserName("");
      setUserMail("");
      setUserPassword("");
      setUserRol("POS_OPERATOR");
      setError(null);
    }
  }, [open]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setDocumentType("RUT");
    setDocumentNumber("");
    setEmail("");
    setPhone("");
    setBranchId(null);
    setLaborUnitId(null);
    setEmploymentType("FULL_TIME");
    setHireDate(todayIsoDate());
    setBaseSalary("");
    setAlsoAsUser(false);
    setUserName("");
    setUserMail("");
    setUserPassword("");
    setUserRol("POS_OPERATOR");
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createEmployeeAction({
          ...(linkedPersonId
            ? { personId: linkedPersonId }
            : {
                firstName: firstName.trim(),
                lastName: lastName.trim() || undefined,
                documentType,
                documentNumber: documentNumber.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
              }),
          branchId,
          laborUnitId,
          employmentType,
          hireDate: hireDate.trim(),
          baseSalary: baseSalary.trim() || null,
          alsoAsUser:
            alsoAsUser && !alreadyUser
              ? {
                  userName: userName.trim(),
                  mail: userMail.trim(),
                  password: userPassword,
                  rol: userRol,
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
    documentNumber.trim().length > 0 &&
    hireDate.trim().length > 0 &&
    Boolean(laborUnitId) &&
    (personReadOnly || firstName.trim().length > 0) &&
    (!alsoAsUser ||
      alreadyUser ||
      (userName.trim().length >= 3 &&
        userMail.trim().length > 0 &&
        userPassword.length >= 6));

  const useDniField = documentType === "RUT";
  const documentNumberLabel =
    documentType === "RUT" ? "RUT" : documentType === "OTHER" ? "Otro" : "Número de documento";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nuevo empleado"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="employee-create-dialog"
      alertArea={
        <div className="flex flex-col gap-2">
          <PersonDocumentStatusAlert status={docLookup} intentRole="employee" />
          {error ? (
            <Alert variant="error" data-test-id="employee-create-error">
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
            Crear empleado
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Se registrará la persona y su vínculo laboral en la empresa activa.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="employee-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            required
            disabled={personReadOnly || isPending}
            data-test-id="employee-create-first-name"
          />
          <TextField
            label="Apellidos (opcional)"
            name="employee-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellidos (opcional)"
            disabled={personReadOnly || isPending}
            data-test-id="employee-create-last-name"
          />
        </div>

        <Select
          label="Tipo de documento"
          name="employee-doc-type"
          placeholder="Tipo de documento"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(v) =>
            setDocumentType((v != null ? String(v) : "RUT") as "RUT" | "PASSPORT" | "OTHER")
          }
          required
          disabled={personReadOnly || isPending}
          data-test-id="employee-create-doc-type"
        />

        <TextField
          label={documentNumberLabel}
          name="employee-document-number"
          type={useDniField ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder={documentNumberLabel}
          required
          data-test-id="employee-create-document"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Correo (opcional)"
            name="employee-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo (opcional)"
            data-test-id="employee-create-email"
          />
          <TextField
            label="Teléfono (opcional)"
            name="employee-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            data-test-id="employee-create-phone"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Datos laborales</p>

          <Select
            label="Sucursal (opcional)"
            name="employee-branch"
            placeholder="Sin sucursal"
            options={branchOptions}
            value={branchId}
            onChange={(v) => setBranchId(v != null ? String(v) : null)}
            allowClear
            data-test-id="employee-create-branch"
          />

          <Select
            label="Unidad laboral"
            name="employee-labor-unit"
            placeholder="Seleccionar unidad laboral"
            options={laborUnitOptions}
            value={laborUnitId}
            onChange={(v) =>
              setLaborUnitId(v != null && String(v) !== "" ? String(v) : null)
            }
            required
            data-test-id="employee-create-labor-unit"
          />

          <Select
            label="Tipo de contrato"
            name="employee-employment-type"
            placeholder="Tipo de contrato"
            options={EMPLOYMENT_TYPE_OPTIONS}
            value={employmentType}
            onChange={(v) => setEmploymentType(v != null ? String(v) : "FULL_TIME")}
            required
            data-test-id="employee-create-employment-type"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Fecha de ingreso"
              name="employee-hire-date"
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              required
              data-test-id="employee-create-hire-date"
            />
            <TextField
              label="Sueldo base (opcional)"
              name="employee-base-salary"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              data-test-id="employee-create-base-salary"
            />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={alsoAsUser && !alreadyUser}
            disabled={alreadyUser || isPending}
            onChange={(e) => setAlsoAsUser(e.target.checked)}
            data-test-id="employee-create-also-user"
          />
          También crear usuario de plataforma
        </label>
        {alreadyUser ? (
          <p className="text-sm text-muted-foreground">Esta persona ya tiene usuario de plataforma.</p>
        ) : null}
        {alsoAsUser && !alreadyUser ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <TextField
              label="Usuario"
              name="employee-user-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              data-test-id="employee-create-user-name"
            />
            <TextField
              label="Correo de acceso"
              name="employee-user-mail"
              type="email"
              value={userMail}
              onChange={(e) => setUserMail(e.target.value)}
              required
              data-test-id="employee-create-user-mail"
            />
            <TextField
              label="Contraseña"
              name="employee-user-password"
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
              data-test-id="employee-create-user-password"
            />
            <Select
              label="Rol"
              name="employee-user-rol"
              options={USER_ROLE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              value={userRol}
              onChange={(v) => setUserRol(v != null ? String(v) : "POS_OPERATOR")}
              data-test-id="employee-create-user-rol"
            />
          </div>
        ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
