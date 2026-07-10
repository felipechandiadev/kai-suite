"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { updateCompanyAction } from "@/features/companies/actions/companies.action";
import type { CompanyDetail } from "@/features/companies/types/company.types";

export type UpdateCompanyDialogProps = {
  open: boolean;
  onClose: () => void;
  company: CompanyDetail;
  onSuccess?: () => void;
};

export function UpdateCompanyDialog({
  open,
  onClose,
  company,
  onSuccess,
}: UpdateCompanyDialogProps) {
  const [razonSocial, setRazonSocial] = useState(company.razonSocial);
  const [nombreFantasia, setNombreFantasia] = useState(
    company.nombreFantasia ?? "",
  );
  const [businessActivity, setBusinessActivity] = useState(
    company.businessActivity ?? "",
  );
  const [rut, setRut] = useState(company.rut);
  const [isActive, setIsActive] = useState(company.isActive);
  const [address, setAddress] = useState(company.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setRazonSocial(company.razonSocial);
    setNombreFantasia(company.nombreFantasia ?? "");
    setBusinessActivity(company.businessActivity ?? "");
    setRut(company.rut);
    setIsActive(company.isActive);
    setAddress(company.address ?? "");
    setError(null);
  }, [open, company]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateCompanyAction(company.id, {
          razonSocial: razonSocial.trim(),
          nombreFantasia: nombreFantasia.trim() || null,
          businessActivity: businessActivity.trim() || null,
          rut: rut.trim(),
          isActive,
          address: address.trim() || null,
        });
        if (r.success) {
          onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit =
    razonSocial.trim().length > 0 && rut.trim().length > 0 && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar empresa"
      size="lg"
      scroll="paper"
      data-test-id="company-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="company-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Razón social"
          name="company-razon-social"
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          required
        />
        <TextField
          label="Nombre de fantasía (opcional)"
          name="company-nombre-fantasia"
          value={nombreFantasia}
          onChange={(e) => setNombreFantasia(e.target.value)}
        />
        <TextField
          label="Giro / Actividad (opcional)"
          name="company-business-activity"
          value={businessActivity}
          onChange={(e) => setBusinessActivity(e.target.value)}
        />
        <TextField
          label="RUT"
          name="company-rut"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          required
        />
        <TextField
          label="Dirección (opcional)"
          name="company-address"
          type="textarea"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Empresa activa"
            labelPosition="right"
          />
        </div>
      </div>
    </Dialog>
  );
}
