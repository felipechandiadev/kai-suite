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
import { createCustomerAction } from "@/features/sales-customers/actions/customer.action";
import type {
  CreateCustomerFormInput,
  CustomerDocumentType,
} from "@/features/sales-customers/types/customer.types";
import { CompanyRutFieldWithSiiLookup } from "@/features/chile-person/ui/CompanyRutFieldWithSiiLookup";
import type { SiiCompanyFormDraft } from "@/features/chile-person/types/sii-tax-status.types";

const PERSON_TYPE_OPTIONS: Option[] = [
  { id: "NATURAL", label: "Persona natural" },
  { id: "COMPANY", label: "Empresa" },
];

const DOC_NATURAL_OPTIONS: Option[] = [
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
];

const PAYMENT_DAY_OPTIONS: Option[] = [
  { id: "5", label: "5" },
  { id: "10", label: "10" },
  { id: "15", label: "15" },
  { id: "20", label: "20" },
  { id: "25", label: "25" },
  { id: "30", label: "30" },
];

export type CreateCustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  /** Si false, no se muestran límite de crédito ni día de pago. */
  internalCreditEnabled?: boolean;
};

export function CreateCustomerDialog({
  open,
  onClose,
  onSuccess,
  internalCreditEnabled = true,
}: CreateCustomerDialogProps) {
  const [personType, setPersonType] = useState<"NATURAL" | "COMPANY">("NATURAL");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [documentType, setDocumentType] = useState<CustomerDocumentType>("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [geo, setGeo] = useState<ChileGeoValue>(emptyChileGeoValue);
  const [activityStarted, setActivityStarted] = useState(false);
  const [economicActivities, setEconomicActivities] = useState<PersonEconomicActivity[]>([]);
  const [creditLimitStr, setCreditLimitStr] = useState("0");
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState<string>("5");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setCreditLimitStr("0");
      setPaymentDayOfMonth("5");
      setNotes("");
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
    setCreditLimitStr("0");
    setPaymentDayOfMonth("5");
    setNotes("");
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
    const creditLimit = internalCreditEnabled
      ? Math.max(0, Math.round(Number(creditLimitStr.replace(/\D/g, "")) || 0))
      : 0;
    const day = Number(paymentDayOfMonth) as CreateCustomerFormInput["paymentDayOfMonth"];
    const geoFields = geoPayloadFromChileGeo(geo);
    const input: CreateCustomerFormInput = {
      personType,
      firstName: personType === "NATURAL" ? firstName : undefined,
      lastName: personType === "NATURAL" ? lastName : undefined,
      businessName: personType === "COMPANY" ? businessName : undefined,
      documentType: personType === "COMPANY" ? "RUT" : documentType,
      documentNumber: documentNumber.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      ...geoFields,
      activityStarted,
      economicActivities: activityStarted && economicActivities.length > 0 ? economicActivities : undefined,
      creditLimit,
      paymentDayOfMonth: internalCreditEnabled
        ? [5, 10, 15, 20, 25, 30].includes(day)
          ? day
          : 5
        : 5,
      notes: notes.trim() || null,
    };

    startTransition(() => {
      void (async () => {
        const r = await createCustomerAction(input);
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
      : firstName.trim().length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nuevo cliente"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="customer-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="customer-create-error">
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
            Crear cliente
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          El cliente se asocia a una persona o empresa. El número de documento debe ser único en el sistema.
        </p>

        <Select
          label="Tipo de titular"
          name="customer-person-type"
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
          data-test-id="customer-create-person-type"
        />

        {personType === "COMPANY" ? (
          <TextField
            label="Razón social"
            name="customer-business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Razón social"
            required
            data-test-id="customer-create-business-name"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Nombre"
              name="customer-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              required
              data-test-id="customer-create-first-name"
            />
            <TextField
              label="Apellidos (opcional)"
              name="customer-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellidos"
              data-test-id="customer-create-last-name"
            />
          </div>
        )}

        {personType === "NATURAL" ? (
          <Select
            label="Tipo de documento"
            name="customer-doc-type"
            placeholder="Tipo de documento"
            options={DOC_NATURAL_OPTIONS}
            value={documentType}
            onChange={(v) =>
              setDocumentType((v != null ? String(v) : "RUT") as CustomerDocumentType)
            }
            required
            data-test-id="customer-create-doc-type"
          />
        ) : null}

        {personType === "COMPANY" ? (
          <CompanyRutFieldWithSiiLookup
            label="RUT"
            name="customer-document-number"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="RUT"
            required
            disabled={isPending}
            onApplySiiData={handleApplySiiData}
            hasExistingData={hasSiiOverwriteData}
            data-test-id="customer-create-document"
            testIdPrefix="customer-create"
          />
        ) : (
          <TextField
            label={documentNumberLabel}
            name="customer-document-number"
            type={useDniField ? "dni" : "text"}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder={documentNumberLabel}
            required
            data-test-id="customer-create-document"
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Correo (opcional)"
            name="customer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-test-id="customer-create-email"
          />
          <TextField
            label="Teléfono (opcional)"
            name="customer-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-test-id="customer-create-phone"
          />
        </div>

        <ChileRegionCommuneFields
          value={geo}
          onChange={setGeo}
          disabled={isPending}
          testIdPrefix="customer-create-geo"
        />

        <EconomicActivitiesEditor
          activityStarted={activityStarted}
          onActivityStartedChange={setActivityStarted}
          value={economicActivities}
          onChange={setEconomicActivities}
          disabled={isPending}
          testIdPrefix="customer-create-acteco"
        />

        {internalCreditEnabled ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Crédito</p>
            <TextField
              label="Límite de crédito (CLP)"
              name="customer-credit-limit"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={creditLimitStr}
              onChange={(e) => setCreditLimitStr(e.target.value)}
              data-test-id="customer-create-credit-limit"
            />
            <Select
              label="Día de pago del mes"
              name="customer-payment-day"
              placeholder="Día de pago"
              options={PAYMENT_DAY_OPTIONS}
              value={paymentDayOfMonth}
              onChange={(v) => setPaymentDayOfMonth(v != null ? String(v) : "5")}
              alwaysShowLabel
              data-test-id="customer-create-payment-day"
            />
          </div>
        ) : null}

        <TextField
          label="Notas (opcional)"
          name="customer-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-test-id="customer-create-notes"
        />
      </div>
    </Dialog>
  );
}
