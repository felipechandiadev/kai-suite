"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import { createShareholderAction } from "@/features/settings-shareholders/actions/shareholder.action";
import { PARTNER_TYPE_OPTIONS } from "@/features/settings-shareholders/lib/partner-type-labels";

const DOC_OPTIONS: Option[] = [
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
];

type CreatePartnerDialogProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onCreated?: () => void | Promise<void>;
};

export function CreatePartnerDialog({ open, onClose, companyId, onCreated }: CreatePartnerDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<string | null>("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ownership, setOwnership] = useState("");
  const [partnerType, setPartnerType] = useState<string | null>("FOUNDING_PARTNER");
  const [joinDate, setJoinDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setFirstName("");
    setLastName("");
    setDocumentType("RUT");
    setDocumentNumber("");
    setOwnership("");
    setPartnerType("FOUNDING_PARTNER");
    setJoinDate("");
    setError(null);
  }, [open]);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      documentNumber.trim().length > 0 &&
      documentType &&
      partnerType &&
      joinDate.trim().length > 0 &&
      !pending
    );
  }, [firstName, documentNumber, documentType, partnerType, joinDate, pending]);

  const submit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const own = Number(String(ownership).replace(",", "."));
        const r = await createShareholderAction({
          companyId,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          documentType: String(documentType),
          documentNumber: documentNumber.trim(),
          ownershipPercentage: Number.isFinite(own) && own > 0 ? own : undefined,
          partnerType: String(partnerType),
          joinDate: joinDate.trim(),
        });
        if (r.success) {
          await onCreated?.();
          onClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      title="Agregar socio"
      size="md"
      scroll="paper"
      data-test-id="create-partner-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Select
          label="Tipo documento"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(id) => setDocumentType(id == null ? null : String(id).trim())}
          required
        />
        <TextField
          label="Número documento"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />
        <TextField
          label="Participación (%)"
          value={ownership}
          onChange={(e) => setOwnership(e.target.value)}
          placeholder="0-100"
        />
        <Select
          label="Tipo de socio"
          options={PARTNER_TYPE_OPTIONS}
          value={partnerType}
          onChange={(id) => setPartnerType(id == null ? null : String(id).trim())}
          required
        />
        <TextField label="Fecha de ingreso" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
      </div>
    </Dialog>
  );
}
