"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import type { PersonEconomicActivity } from "@kai/chile-catalogs";
import { ChileRegionCommuneFields } from "@/features/chile-person/ui/ChileRegionCommuneFields";
import { EconomicActivitiesEditor } from "@/features/chile-person/ui/EconomicActivitiesEditor";
import {
  emptyChileGeoValue,
  geoPayloadFromChileGeo,
} from "@/features/chile-person/lib/person-geo-payload.util";
import type { ChileGeoValue } from "@/features/chile-person/ui/ChileRegionCommuneFields";
import { createSupplierAction } from "@/features/purchasing-suppliers/actions/supplier.action";
import type { SupplierDocumentType } from "@/features/purchasing-suppliers/types/supplier.types";
import { CompanyRutFieldWithSiiLookup } from "@/features/chile-person/ui/CompanyRutFieldWithSiiLookup";
import type { SiiCompanyFormDraft } from "@/features/chile-person/types/sii-tax-status.types";
import { usePersonDocumentLookup } from "@/features/chile-person/ui/usePersonDocumentLookup";
import { PersonDocumentStatusAlert } from "@/features/chile-person/ui/PersonDocumentStatusAlert";

const PERSON_TYPE_OPTIONS: Option[] = [
  { id: "NATURAL", label: "Persona natural" },
  { id: "COMPANY", label: "Empresa" },
];

const DOC_NATURAL_OPTIONS: Option[] = [
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
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
  const [documentType, setDocumentType] = useState<SupplierDocumentType>("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [geo, setGeo] = useState<ChileGeoValue>(emptyChileGeoValue);
  const [activityStarted, setActivityStarted] = useState(false);
  const [economicActivities, setEconomicActivities] = useState<PersonEconomicActivity[]>([]);
  const [supplierType, setSupplierType] = useState("DISTRIBUTOR");
  const [defaultPaymentTermDays, setDefaultPaymentTermDays] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const docLookup = usePersonDocumentLookup({
    documentNumber,
    documentType: personType === "COMPANY" ? "RUT" : documentType,
    intentRole: "supplier",
    enabled: open,
  });
  const personReadOnly = docLookup.kind === "reuse_readonly";
  const linkedPersonId = docLookup.kind === "reuse_readonly" ? docLookup.person.id : null;

  useEffect(() => {
    if (docLookup.kind !== "reuse_readonly") return;
    const p = docLookup.person;
    const nextType = p.type === "COMPANY" ? "COMPANY" : "NATURAL";
    setPersonType(nextType);
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setBusinessName(p.businessName ?? "");
    setDocumentType((p.documentType as SupplierDocumentType) || "RUT");
    setDocumentNumber(p.documentNumber ?? "");
    setEmail(p.email ?? "");
    setPhone(p.phone ?? "");
    setGeo({
      regionCode: p.regionCode ?? null,
      regionName: p.regionName ?? null,
      communeCode: p.communeCode ?? null,
      communeName: p.communeName ?? null,
      treasuryCode: p.treasuryCode ?? null,
      address: p.address?.trim() ?? "",
    });
    setActivityStarted(p.activityStarted === true);
    setEconomicActivities(
      Array.isArray(p.economicActivities) ? (p.economicActivities as PersonEconomicActivity[]) : [],
    );
  }, [docLookup]);

  useEffect(() => {
    if (open) {
      setPersonType("NATURAL");
      setFirstName("");
      setLastName("");
      setBusinessName("");
      setDocumentType("RUT");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setGeo(emptyChileGeoValue());
      setActivityStarted(false);
      setEconomicActivities([]);
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
    setDocumentType("RUT");
    setDocumentNumber("");
    setEmail("");
    setPhone("");
    setGeo(emptyChileGeoValue());
    setActivityStarted(false);
    setEconomicActivities([]);
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
    personType === "COMPANY" || (personType === "NATURAL" && documentType === "RUT");

  const documentNumberLabel =
    personType === "COMPANY"
      ? "RUT"
      : documentType === "RUT"
        ? "RUT"
        : documentType === "OTHER"
          ? "Otro"
          : "Número de documento";

  const handleApplySiiData = (draft: SiiCompanyFormDraft) => {
    setBusinessName(draft.businessName);
    setDocumentNumber(draft.documentNumber);
    setActivityStarted(draft.activityStarted);
    setEconomicActivities(draft.economicActivities);
  };

  const hasSiiOverwriteData =
    businessName.trim().length > 0 || economicActivities.length > 0;

  const handleSubmit = () => {
    setError(null);
    const term = Math.max(0, Math.round(Number(defaultPaymentTermDays) || 0));
    startTransition(() => {
      void (async () => {
        const geoFields = geoPayloadFromChileGeo(geo);
        const r = await createSupplierAction(
          linkedPersonId
            ? {
                personId: linkedPersonId,
                supplierType,
                defaultPaymentTermDays: term,
              }
            : {
                personType,
                firstName: personType === "NATURAL" ? firstName : undefined,
                lastName: personType === "NATURAL" ? lastName : undefined,
                businessName: personType === "COMPANY" ? businessName : undefined,
                documentType: personType === "COMPANY" ? "RUT" : documentType,
                documentNumber,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                ...geoFields,
                activityStarted,
                economicActivities:
                  activityStarted && economicActivities.length > 0 ? economicActivities : undefined,
                supplierType,
                defaultPaymentTermDays: term,
              },
        );
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
    (personReadOnly ||
      (personType === "COMPANY"
        ? businessName.trim().length > 0
        : firstName.trim().length > 0));

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
        <div className="flex flex-col gap-2">
          <PersonDocumentStatusAlert status={docLookup} intentRole="supplier" />
          {error ? (
            <Alert variant="error" data-test-id="supplier-create-error">
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
            }
          }}
          required
          disabled={personReadOnly || isPending}
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
            disabled={personReadOnly || isPending}
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
              disabled={personReadOnly || isPending}
              data-test-id="supplier-create-first-name"
            />
            <TextField
              label="Apellidos (opcional)"
              name="supplier-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellidos (opcional)"
              disabled={personReadOnly || isPending}
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
            onChange={(v) => setDocumentType((v != null ? String(v) : "RUT") as SupplierDocumentType)}
            required
            disabled={personReadOnly || isPending}
            data-test-id="supplier-create-doc-type"
          />
        ) : null}

        {personType === "COMPANY" ? (
          <CompanyRutFieldWithSiiLookup
            label="RUT"
            name="supplier-document-number"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="RUT"
            required
            disabled={personReadOnly || isPending}
            onApplySiiData={handleApplySiiData}
            hasExistingData={hasSiiOverwriteData}
            data-test-id="supplier-create-document"
            testIdPrefix="supplier-create"
          />
        ) : (
          <TextField
            label={documentNumberLabel}
            name="supplier-document-number"
            type={useDniField ? "dni" : "text"}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder={documentNumberLabel}
            required
            disabled={personReadOnly || isPending}
            data-test-id="supplier-create-document"
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Correo (opcional)"
            name="supplier-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo (opcional)"
            disabled={personReadOnly || isPending}
            data-test-id="supplier-create-email"
          />
          <TextField
            label="Teléfono (opcional)"
            name="supplier-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            disabled={personReadOnly || isPending}
            data-test-id="supplier-create-phone"
          />
        </div>

        <ChileRegionCommuneFields
          value={geo}
          onChange={setGeo}
          disabled={personReadOnly || isPending}
          testIdPrefix="supplier-create-geo"
        />

        <EconomicActivitiesEditor
          activityStarted={activityStarted}
          onActivityStartedChange={setActivityStarted}
          value={economicActivities}
          onChange={setEconomicActivities}
          disabled={personReadOnly || isPending}
          testIdPrefix="supplier-create-acteco"
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
