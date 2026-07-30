"use client";

import { useCallback, useEffect, useState } from "react";
import { TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { Alert } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { updateCompanyGeneralAction } from "@/features/settings-company/actions/company.action";

type Props = {
  company: CompanyDetails;
  onSaved?: () => void;
};

export function CompanyGeneralSection({ company, onSaved }: Props) {
  const hasCompanyRow = Boolean(company.id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [razonSocial, setRazonSocial] = useState(company.razonSocial);
  const [nombreFantasia, setNombreFantasia] = useState(company.nombreFantasia ?? "");
  const [rut, setRut] = useState(company.rut ?? "");
  const [businessActivity, setBusinessActivity] = useState(company.businessActivity ?? "");
  const [address, setAddress] = useState(company.address ?? "");

  const syncFromCompany = useCallback(() => {
    setRazonSocial(company.razonSocial);
    setNombreFantasia(company.nombreFantasia ?? "");
    setRut(company.rut ?? "");
    setBusinessActivity(company.businessActivity ?? "");
    setAddress(company.address ?? "");
  }, [company]);

  useEffect(() => {
    if (!editing) {
      syncFromCompany();
    }
  }, [company, editing, syncFromCompany]);

  async function handleSave() {
    setError(null);
    if (!hasCompanyRow) {
      setError("No hay empresa persistida para editar.");
      return;
    }
    setBusy(true);
    try {
      const r = await updateCompanyGeneralAction({
        razonSocial: razonSocial.trim(),
        nombreFantasia: nombreFantasia.trim(),
        rut: rut.trim(),
        businessActivity: businessActivity.trim(),
        address: address.trim() || null,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setEditing(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  function toggleEdit() {
    setError(null);
    if (editing) {
      void handleSave();
      return;
    }
    syncFromCompany();
    setEditing(true);
  }

  const readOnly = !editing;
  const showHint = !hasCompanyRow;

  return (
    <section
      className="relative rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="settings-company-general-section"
    >
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Información general</h2>

      {showHint ? (
        <Alert variant="warning" className="mb-4">
          La empresa aún no tiene un registro persistido en el sistema. Los datos mostrados son de ejemplo; la edición
          estará disponible cuando exista una fila de empresa en la base de datos.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Razón social"
          placeholder="Razón social"
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          readOnly={readOnly}
          disabled={busy}
          className="min-w-0"
          data-test-id="settings-company-field-razon-social"
        />
        <TextField
          label="Nombre de fantasía"
          placeholder="Nombre de fantasía"
          value={nombreFantasia}
          onChange={(e) => setNombreFantasia(e.target.value)}
          readOnly={readOnly}
          disabled={busy}
          className="min-w-0"
          data-test-id="settings-company-field-nombre-fantasia"
        />
        <TextField
          label="RUT"
          placeholder="RUT"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          readOnly={readOnly}
          disabled={busy}
          className="min-w-0"
          data-test-id="settings-company-field-rut"
        />
        <TextField
          label="Actividad comercial"
          placeholder="Actividad comercial"
          value={businessActivity}
          onChange={(e) => setBusinessActivity(e.target.value)}
          readOnly={readOnly}
          disabled={busy}
          className="min-w-0"
          data-test-id="settings-company-field-business-activity"
        />
        <div className="min-w-0 md:col-span-2">
          <TextField
            label="Dirección"
            placeholder="Calle, número, comuna, ciudad"
            type="textarea"
            rows={3}
            name="company-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            readOnly={readOnly}
            disabled={busy}
            className="min-w-0 w-full"
            data-test-id="settings-company-field-address"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="md"
          ariaLabel={editing ? "Guardar cambios" : "Editar información general"}
          disabled={busy || (!editing && !hasCompanyRow)}
          isLoading={busy}
          onClick={() => toggleEdit()}
          data-test-id="settings-company-general-edit-save"
        />
      </div>
    </section>
  );
}
