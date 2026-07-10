"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { createCompanyAction } from "@/features/companies/actions/companies.action";

export type CreateCompanyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateCompanyDialog({
  open,
  onClose,
  onSuccess,
}: CreateCompanyDialogProps) {
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreFantasia, setNombreFantasia] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [rut, setRut] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("CLP");
  const [isActive, setIsActive] = useState(true);
  const [address, setAddress] = useState("");
  const [mail, setMail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setRazonSocial("");
    setNombreFantasia("");
    setBusinessActivity("");
    setRut("");
    setDefaultCurrency("CLP");
    setIsActive(true);
    setAddress("");
    setMail("");
    setPhone("");
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
        const r = await createCompanyAction({
          razonSocial: razonSocial.trim(),
          nombreFantasia: nombreFantasia.trim() || null,
          businessActivity: businessActivity.trim() || null,
          rut: rut.trim(),
          defaultCurrency: defaultCurrency.trim() || "CLP",
          isActive,
          address: address.trim() || null,
          mail: mail.trim() || null,
          phone: phone.trim() || null,
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
      title="Crear empresa"
      size="lg"
      scroll="paper"
      data-test-id="company-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="company-create-error">
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
            data-test-id="company-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="company-create-submit"
          >
            Crear
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
          data-test-id="company-create-razon-social"
        />
        <TextField
          label="Nombre de fantasía (opcional)"
          name="company-nombre-fantasia"
          value={nombreFantasia}
          onChange={(e) => setNombreFantasia(e.target.value)}
          data-test-id="company-create-nombre-fantasia"
        />
        <TextField
          label="Giro / Actividad (opcional)"
          name="company-business-activity"
          value={businessActivity}
          onChange={(e) => setBusinessActivity(e.target.value)}
          data-test-id="company-create-business-activity"
        />
        <TextField
          label="RUT"
          name="company-rut"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          required
          data-test-id="company-create-rut"
        />
        <TextField
          label="Correo (opcional)"
          name="company-create-mail"
          type="email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          data-test-id="company-create-mail"
        />
        <TextField
          label="Teléfono (opcional)"
          name="company-create-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-test-id="company-create-phone"
        />
        <TextField
          label="Dirección (opcional)"
          name="company-create-address"
          type="textarea"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          data-test-id="company-create-address"
        />
        <TextField
          label="Moneda por defecto"
          name="company-default-currency"
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
          data-test-id="company-create-default-currency"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Empresa activa"
            labelPosition="right"
            data-test-id="company-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
