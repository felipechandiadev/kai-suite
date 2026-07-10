"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Select } from "@kai/ui";
import { Alert } from "@kai/ui";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyCheckSettings,
  type CompanyCheckSettings,
} from "@/features/companies/types/company-checks.types";
import {
  getCompanyCheckSettingsAction,
  replaceCompanyCheckSettingsAction,
} from "@/features/companies/actions/companies-checks.action";

type Props = {
  company: CompanyDetails;
};

export function CompanyChecksSection({ company }: Props) {
  const router = useRouter();
  const companyId = company.id;

  const [settings, setSettings] = useState<CompanyCheckSettings>(
    defaultCompanyCheckSettings(),
  );
  const [initial, setInitial] = useState<CompanyCheckSettings>(
    defaultCompanyCheckSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getCompanyCheckSettingsAction(companyId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSettings(res.checkSettings);
          setInitial(res.checkSettings);
        } else {
          setLoadError(res.error);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const bankOptions = (company.bankAccounts ?? [])
    .filter((a) => !!a.accountKey)
    .map((a) => ({
      id: a.accountKey as string,
      label: `${a.bankName} · ${a.accountNumber}${a.accountType ? ` · ${a.accountType}` : ""}`,
    }));

  const dirty = JSON.stringify(settings) !== JSON.stringify(initial);

  function patch(part: Partial<CompanyCheckSettings>) {
    setSettings((s) => {
      const next = { ...s, ...part } as CompanyCheckSettings;
      if (next.enabled === false) {
        next.receiveChecks = false;
        next.issueChecks = false;
        next.allowPostdatedReceived = false;
        next.allowPostdatedIssued = false;
      }
      if (next.receiveChecks === false) {
        next.allowPostdatedReceived = false;
      }
      if (next.issueChecks === false) {
        next.allowPostdatedIssued = false;
      }
      return next;
    });
  }

  async function save() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyCheckSettingsAction(companyId, settings);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSettings(res.checkSettings);
      setInitial(res.checkSettings);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSettings(initial);
    setError(null);
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
      data-test-id="settings-company-checks-section"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Cheques
        </h2>
      </div>

      {!companyId ? (
        <p className="text-sm text-muted-foreground">
          La configuración de cheques requiere una empresa registrada.
        </p>
      ) : loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : loading ? (
        <LoadingState className="flex items-center justify-center py-4" />
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="flex flex-col gap-3">
            <Switch
              label="Habilitar gestión de cheques en esta empresa"
              labelPosition="right"
              checked={settings.enabled}
              disabled={busy}
              onChange={(v) => patch({ enabled: v })}
              data-test-id="settings-company-checks-enabled"
            />
            <div className="ml-2 flex flex-col gap-3 border-l border-border pl-4">
              <div className="flex flex-col gap-2">
                <Switch
                  label="Aceptar cheques como pago entrante"
                  labelPosition="right"
                  checked={settings.receiveChecks}
                  disabled={busy || !settings.enabled}
                  onChange={(v) => patch({ receiveChecks: v })}
                  data-test-id="settings-company-checks-receive"
                />
                <div className="ml-2 border-l border-border pl-3">
                  <Switch
                    label="Permitir cheques a fecha en cheques recibidos"
                    labelPosition="right"
                    checked={settings.allowPostdatedReceived}
                    disabled={
                      busy || !settings.enabled || !settings.receiveChecks
                    }
                    onChange={(v) =>
                      patch({ allowPostdatedReceived: v })
                    }
                    data-test-id="settings-company-checks-postdated-received"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Switch
                  label="Emitir cheques para pagar a proveedores/gastos"
                  labelPosition="right"
                  checked={settings.issueChecks}
                  disabled={busy || !settings.enabled}
                  onChange={(v) => patch({ issueChecks: v })}
                  data-test-id="settings-company-checks-issue"
                />
                <div className="ml-2 border-l border-border pl-3">
                  <Switch
                    label="Permitir cheques a fecha en cheques emitidos"
                    labelPosition="right"
                    checked={settings.allowPostdatedIssued}
                    disabled={
                      busy || !settings.enabled || !settings.issueChecks
                    }
                    onChange={(v) => patch({ allowPostdatedIssued: v })}
                    data-test-id="settings-company-checks-postdated-issued"
                  />
                </div>
              </div>
            </div>
          </div>

          {settings.enabled ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Cuenta predeterminada para depositar cheques recibidos"
                options={[{ id: "", label: "— Sin selección —" }, ...bankOptions]}
                value={settings.defaultDepositBankAccountKey ?? ""}
                onChange={(id) =>
                  patch({
                    defaultDepositBankAccountKey: id ? String(id) : null,
                  })
                }
                data-test-id="settings-company-checks-deposit-account"
                disabled={busy || !settings.receiveChecks}
              />
              <Select
                label="Cuenta predeterminada para emitir cheques"
                options={[{ id: "", label: "— Sin selección —" }, ...bankOptions]}
                value={settings.defaultIssueBankAccountKey ?? ""}
                onChange={(id) =>
                  patch({
                    defaultIssueBankAccountKey: id ? String(id) : null,
                  })
                }
                data-test-id="settings-company-checks-issue-account"
                disabled={busy || !settings.issueChecks}
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outlinedSecondary"
              onClick={reset}
              disabled={busy || !dirty}
              data-test-id="settings-company-checks-reset"
            >
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={save}
              disabled={busy || !dirty}
              data-test-id="settings-company-checks-save"
            >
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
