"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  LoadingState,
} from "@kai/ui";
import { lookupSiiTaxStatusAction } from "../actions/sii-tax-status.action";
import { buildCompanyFormDraftFromSii } from "../lib/map-sii-tax-status-to-form";
import type { SiiCompanyFormDraft, SiiTaxStatusView } from "../types/sii-tax-status.types";

export type SiiTaxStatusResultDialogProps = {
  open: boolean;
  rut: string;
  onClose: () => void;
  onApply: (draft: SiiCompanyFormDraft) => void;
  /** Si el formulario padre ya tiene datos que se reemplazarían. */
  hasExistingData?: boolean;
  zIndex?: number;
};

export function SiiTaxStatusResultDialog({
  open,
  rut,
  onClose,
  onApply,
  hasExistingData = false,
  zIndex = 60,
}: SiiTaxStatusResultDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SiiTaxStatusView | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setActiveCode(null);
    setConfirmOverwrite(false);
    const result = await lookupSiiTaxStatusAction(rut);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setData(result.data);
    const first = result.data.economicActivities[0]?.code ?? null;
    setActiveCode(first);
  }, [rut]);

  useEffect(() => {
    if (open && rut.trim()) {
      void fetchData();
    } else if (!open) {
      setLoading(false);
      setError(null);
      setData(null);
      setActiveCode(null);
      setConfirmOverwrite(false);
    }
  }, [open, rut, fetchData]);

  const needsActivityPick = (data?.economicActivities.length ?? 0) > 1;
  const canApply = useMemo(() => {
    if (!data) return false;
    if (data.activityStarted && data.economicActivities.length > 0 && !activeCode) {
      return false;
    }
    if (hasExistingData && !confirmOverwrite) return false;
    return true;
  }, [data, activeCode, hasExistingData, confirmOverwrite]);

  const handleApply = () => {
    if (!data || !canApply) return;
    const code =
      activeCode ??
      data.economicActivities[0]?.code ??
      "";
    const draft = buildCompanyFormDraftFromSii(data, code);
    onApply(draft);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Situación tributaria SII"
      size="md"
      scroll="paper"
      zIndex={zIndex}
      showCloseButton
      data-test-id="sii-tax-status-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="sii-tax-status-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={!canApply || loading}
            data-test-id="sii-tax-status-apply"
          >
            Cargar en formulario
          </Button>
        </>
      }
      actionsJustify="end"
    >
      {loading ? (
        <LoadingState label="Consultando SII…" />
      ) : data ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Información referencial del Servicio de Impuestos Internos. No certifica el
            comportamiento tributario del contribuyente.
          </p>

          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">RUT</dt>
              <dd className="font-medium text-foreground">{data.rut}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Razón social</dt>
              <dd className="font-medium text-foreground">{data.legalName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inicio de actividades</dt>
              <dd className="font-medium text-foreground">
                {data.activityStarted ? "Sí" : "No"}
                {data.activityStartDate ? ` (${data.activityStartDate})` : ""}
              </dd>
            </div>
          </dl>

          {data.warnings.length > 0 ? (
            <Alert variant="warning">
              <ul className="list-disc pl-4 text-sm">
                {data.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {data.economicActivities.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-foreground">
                Actividades económicas
                {needsActivityPick ? " — seleccione la activa para DTE" : ""}
              </p>
              <ul className="grid gap-2">
                {data.economicActivities.map((act) => (
                  <li
                    key={act.code}
                    className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    {needsActivityPick ? (
                      <input
                        type="radio"
                        name="sii-active-acteco"
                        checked={activeCode === act.code}
                        onChange={() => setActiveCode(act.code)}
                        className="mt-1"
                        aria-label={`Actividad activa ${act.code}`}
                        data-test-id={`sii-acteco-active-${act.code}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {act.code}
                        {!needsActivityPick ? (
                          <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">
                            Activa para DTE
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{act.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {act.category === "SEGUNDA" ? "2ª categoría" : "1ª categoría"}
                        {" · "}
                        {act.ivaAffected ? "Afecto IVA" : "Exento IVA"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : data.activityStarted ? (
            <Alert variant="info">El SII no reportó actividades económicas vigentes.</Alert>
          ) : null}

          {hasExistingData ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
                className="mt-0.5"
                data-test-id="sii-confirm-overwrite"
              />
              <span>
                El formulario ya tiene datos. Confirmo reemplazar razón social y actividades
                económicas.
              </span>
            </label>
          ) : null}
        </div>
      ) : !error ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : null}
    </Dialog>
  );
}
