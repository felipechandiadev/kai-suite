"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { createSupplierAction } from "@/features/purchasing-suppliers/actions/supplier.action";
import type { SupplierDocumentType } from "@/features/purchasing-suppliers/types/supplier.types";

const PERSON_TYPE_OPTIONS: Option[] = [
  { id: "NATURAL", label: "Persona natural" },
  { id: "COMPANY", label: "Empresa" },
];

const DOC_NATURAL_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

const SUPPLIER_TYPE_OPTIONS: Option[] = [
  { id: "MANUFACTURER", label: "Fabricante" },
  { id: "DISTRIBUTOR", label: "Distribuidor" },
  { id: "WHOLESALER", label: "Mayorista" },
  { id: "SERVICE_PROVIDER", label: "Proveedor de servicios" },
  { id: "CONTRACTOR", label: "Contratista" },
  { id: "LOGISTICS", label: "Logística" },
  { id: "IMPORTER", label: "Importador" },
];

export type CreateSupplierDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateSupplierDialog({ open, onClose, onSuccess }: CreateSupplierDialogProps) {
  const [personType, setPersonType] = useState<"NATURAL" | "COMPANY">("NATURAL");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [documentType, setDocumentType] = useState<SupplierDocumentType>("RUN");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [supplierType, setSupplierType] = useState("DISTRIBUTOR");
  const [defaultPaymentTermDays, setDefaultPaymentTermDays] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setPersonType("NATURAL");
      setFirstName("");
      setLastName("");
      setBusinessName("");
      setDocumentType("RUN");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setAddress("");
      setSupplierType("DISTRIBUTOR");
      setDefaultPaymentTermDays("0");
      setError(null);
    }
  }, [open]);

  const reset = () => {
    setPersonType("NATURAL");
    setFirstName("");
    setLastName("");
    setBusinessName("");
    setDocumentType("RUN");
    setDocumentNumber("");
    setEmail("");
    setPhone("");
    setAddress("");
    setSupplierType("DISTRIBUTOR");
    setDefaultPaymentTermDays("0");
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const useDniField =
    personType === "COMPANY" || (personType === "NATURAL" && (documentType === "RUN" || documentType === "DNI"));

  const documentNumberLabel =
    personType === "COMPANY"
      ? "RUT"
      : documentType === "RUN"
        ? "RUN"
        : documentType === "DNI"
          ? "DNI"
          : "Número de documento";

  const handleSubmit = () => {
    setError(null);
    const term = Math.max(0, Math.round(Number(defaultPaymentTermDays) || 0));
    startTransition(() => {
      void (async () => {
        const r = await createSupplierAction({
          personType,
          firstName: personType === "NATURAL" ? firstName : undefined,
          lastName: personType === "NATURAL" ? lastName : undefined,
          businessName: personType === "COMPANY" ? businessName : undefined,
          documentType: personType === "COMPANY" ? "RUT" : documentType,
          documentNumber,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          supplierType,
          defaultPaymentTermDays: term,
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
    documentNumber.trim().length > 0 &&
    (personType === "COMPANY"
      ? businessName.trim().length > 0
      : firstName.trim().length > 0 && documentType !== "RUT");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nuevo proveedor"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="supplier-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="supplier-create-error">
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
            Crear proveedor
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          El proveedor se asocia a una persona o empresa. El número de documento debe ser único en el sistema.
        </p>

        <Select
          label="Tipo de titular"
          name="supplier-person-type"
          placeholder="Tipo de titular"
          options={PERSON_TYPE_OPTIONS}
          value={personType}
          onChange={(v) => {
            const next = v === "COMPANY" ? "COMPANY" : "NATURAL";
            setPersonType(next);
            if (next === "COMPANY") {
              setDocumentType("RUT");
            } else if (documentType === "RUT") {
              setDocumentType("RUN");
            }
          }}
          required
          data-test-id="supplier-create-person-type"
        />

        {personType === "COMPANY" ? (
          <TextField
            label="Razón social"
            name="supplier-business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Razón social"
            required
            data-test-id="supplier-create-business-name"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Nombre"
              name="supplier-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              required
              data-test-id="supplier-create-first-name"
            />
            <TextField
              label="Apellidos (opcional)"
              name="supplier-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellidos (opcional)"
              data-test-id="supplier-create-last-name"
            />
          </div>
        )}

        {personType === "NATURAL" ? (
          <Select
            label="Tipo de documento"
            name="supplier-doc-type"
            placeholder="Tipo de documento"
            options={DOC_NATURAL_OPTIONS}
            value={documentType}
            onChange={(v) => setDocumentType((v != null ? String(v) : "RUN") as SupplierDocumentType)}
            required
            data-test-id="supplier-create-doc-type"
          />
        ) : null}

        <TextField
          label={documentNumberLabel}
          name="supplier-document-number"
          type={useDniField ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder={documentNumberLabel}
          required
          data-test-id="supplier-create-document"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Correo (opcional)"
            name="supplier-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo (opcional)"
            data-test-id="supplier-create-email"
          />
          <TextField
            label="Teléfono (opcional)"
            name="supplier-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            data-test-id="supplier-create-phone"
          />
        </div>

        <TextField
          label="Dirección (opcional)"
          name="supplier-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección (opcional)"
          data-test-id="supplier-create-address"
        />

        <div className="flex flex-col gap-3 pt-2">
          <p className="text-sm font-semibold text-foreground">Datos de proveedor</p>
          <Select
            label="Categoría comercial"
            name="supplier-commercial-type"
            placeholder="Categoría comercial"
            options={SUPPLIER_TYPE_OPTIONS}
            value={supplierType}
            onChange={(v) => setSupplierType(v != null ? String(v) : "DISTRIBUTOR")}
            required
            data-test-id="supplier-create-supplier-type"
          />
          <TextField
            label="Plazo de pago por defecto (días)"
            name="supplier-payment-term"
            value={defaultPaymentTermDays}
            onChange={(e) => setDefaultPaymentTermDays(e.target.value.replace(/\D/g, ""))}
            placeholder="Plazo de pago por defecto (días)"
            data-test-id="supplier-create-payment-term"
          />
        </div>
      </div>
    </Dialog>
  );
}
