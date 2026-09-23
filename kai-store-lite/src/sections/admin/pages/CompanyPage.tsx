import { useCallback, useEffect, useState } from "react";
import { Alert, IconButton, TextField } from "@kai/ui";
import { useLiteCompany } from "@/shared/hooks/useLiteCompany";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { toUserMessage } from "@/lib/errors";
import { liteAdminApi } from "../api/lite-admin.api";

export function CompanyPage() {
  const { data, loading, error, reload } = useLiteCompany();
  const c = data?.company;
  const [editing, setEditing] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreFantasia, setNombreFantasia] = useState("");
  const [rut, setRut] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [address, setAddress] = useState("");
  const [commune, setCommune] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const syncFromCompany = useCallback(() => {
    if (!c) return;
    setRazonSocial(c.razonSocial ?? c.name ?? "");
    setNombreFantasia(c.nombreFantasia ?? "");
    setRut(c.rut ?? "");
    setBusinessActivity(c.businessActivity ?? "");
    setAddress(c.address ?? "");
    setCommune(c.commune ?? "");
    setCity(c.city ?? "");
    setPhone(c.phone ?? "");
    setMail(c.mail ?? "");
  }, [c]);

  useEffect(() => {
    if (!editing) {
      syncFromCompany();
    }
  }, [c, editing, syncFromCompany]);

  async function handleSave() {
    setBusy(true);
    setMsg(null);
    setFormError(null);
    try {
      await liteAdminApi.patchCompany({
        razonSocial: razonSocial.trim() || undefined,
        nombreFantasia: nombreFantasia.trim(),
        rut: rut.trim() || undefined,
        businessActivity: businessActivity.trim() || null,
        address: address.trim() || null,
        commune: commune.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        mail: mail.trim() || null,
      });
      setMsg("Empresa actualizada");
      setEditing(false);
      reload?.();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleEditOrSave() {
    setMsg(null);
    setFormError(null);
    if (editing) {
      void handleSave();
      return;
    }
    syncFromCompany();
    setEditing(true);
  }

  const readOnly = !editing;

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-1 pb-8"
      data-test-id="company-settings-page"
    >
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Empresa
        </h1>
      </header>

      <LoadingLine loading={loading} />
      <CoreError message={error} />

      {!loading && !error && c ? (
        <section
          className="relative space-y-6 rounded-lg border border-border bg-background p-4 pb-14"
          data-test-id="company-general-section"
        >
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          {msg ? <Alert variant="success">{msg}</Alert> : null}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Identidad</h2>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Razón social"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-razon-social"
              />
              <TextField
                label="Nombre fantasía"
                value={nombreFantasia}
                onChange={(e) => setNombreFantasia(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-nombre-fantasia"
              />
              <TextField
                label="RUT"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-rut"
              />
              <TextField
                label="Actividad comercial"
                value={businessActivity}
                onChange={(e) => setBusinessActivity(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-business-activity"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Ubicación</h2>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <TextField
                  label="Dirección"
                  type="textarea"
                  rows={2}
                  name="company-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  readOnly={readOnly}
                  disabled={busy}
                  className="min-w-0 w-full"
                  data-test-id="company-field-address"
                />
              </div>
              <TextField
                label="Comuna"
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-commune"
              />
              <TextField
                label="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-city"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Contacto</h2>
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-phone"
              />
              <TextField
                label="Correo"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="company-field-mail"
              />
            </div>
          </div>

          <div className="absolute bottom-2 right-2">
            <IconButton
              icon={editing ? "Save" : "Pencil"}
              variant="action"
              size="sm"
              ariaLabel={editing ? "Guardar empresa" : "Editar empresa"}
              title={editing ? "Guardar" : "Editar"}
              onClick={toggleEditOrSave}
              disabled={busy}
              isLoading={busy}
              data-test-id="company-edit-save"
            />
          </div>
        </section>
      ) : null}

      {!loading && !error && !c ? (
        <p className="text-sm text-muted-foreground">Sin datos de empresa.</p>
      ) : null}
    </div>
  );
}
