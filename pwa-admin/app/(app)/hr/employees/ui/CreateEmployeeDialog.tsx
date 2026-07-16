"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createEmployeeAction } from "@/features/hr-employees/actions/employee.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

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
}: CreateEmployeeDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUT" | "PASSPORT" | "OTHER">("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [hireDate, setHireDate] = useState(todayIsoDate);
  const [baseSalary, setBaseSalary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions: Option[] = useMemo(
    () =>
      branches
        .filter((b) => b.isActive !== false)
        .map((b) => ({ id: b.id, label: b.name })),
    [branches],
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
      setEmploymentType("FULL_TIME");
      setHireDate(todayIsoDate());
      setBaseSalary("");
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
    setEmploymentType("FULL_TIME");
    setHireDate(todayIsoDate());
    setBaseSalary("");
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
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          documentType,
          documentNumber: documentNumber.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          branchId,
          employmentType,
          hireDate: hireDate.trim(),
          baseSalary: baseSalary.trim() || null,
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
    !isPending && firstName.trim().length > 0 && documentNumber.trim().length > 0 && hireDate.trim().length > 0;

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
        error ? (
          <Alert variant="error" data-test-id="employee-create-error">
            {error}
          </Alert>
        ) : null
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
            data-test-id="employee-create-first-name"
          />
          <TextField
            label="Apellidos (opcional)"
            name="employee-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellidos (opcional)"
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
          </div>
        </div>
      </div>
    </Dialog>
  );
}
