"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Dialog, LoadingState } from "@kai/ui";
import { getSignalEvidenceAction } from "../actions/signals.action";
import type { SignalEvidenceDto, SignalSeverity } from "../types/signal.types";
import { SignalEvidenceChart } from "./SignalEvidenceChart";

const severityBadge: Record<
  SignalSeverity,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  OK: { label: "En rango", variant: "success" },
  WATCH: { label: "Vigilar", variant: "warning" },
  CRITICAL: { label: "Atender", variant: "error" },
  INFO: { label: "Info", variant: "info" },
};

export type SignalEvidenceDialogProps = {
  open: boolean;
  signalId: string | null;
  branchId?: string;
  onClose: () => void;
};

export function SignalEvidenceDialog({
  open,
  signalId,
  branchId,
  onClose,
}: SignalEvidenceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<SignalEvidenceDto | null>(null);

  useEffect(() => {
    if (!open || !signalId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvidence(null);

    void (async () => {
      const res = await getSignalEvidenceAction({ signalId, branchId });
      if (cancelled) return;
      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setEvidence(res.data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, signalId, branchId]);

  const badge = evidence ? severityBadge[evidence.severity] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={evidence?.title ?? "Fundamento de la señal"}
      size="xl"
      fullWidth
      maxWidth={920}
      scroll="paper"
      maxHeight="min(92vh, 880px)"
      data-test-id="signal-evidence-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="signal-evidence-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose}>
            Cerrar
          </Button>
          {evidence?.cta ? (
            <Link
              href={evidence.cta.href}
              onClick={onClose}
              className="inline-flex"
              data-test-id="signal-evidence-cta"
            >
              <Button variant="primary" size="md">
                {evidence.cta.label}
              </Button>
            </Link>
          ) : null}
        </>
      }
      actionsJustify="end"
    >
      {loading ? (
        <LoadingState
          className="flex items-center justify-center py-12"
          label="Cargando evidencia"
        />
      ) : evidence ? (
        <div className="flex flex-col gap-4" data-test-id="signal-evidence-body">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {evidence.headline}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {evidence.methodology}
          </p>

          {evidence.thresholds?.unit ? (
            <p className="text-xs text-muted-foreground">
              Umbrales
              {evidence.thresholds.watch != null
                ? ` · vigilar: ${evidence.thresholds.watch}`
                : ""}
              {evidence.thresholds.critical != null
                ? ` · crítico: ${evidence.thresholds.critical}`
                : ""}
              {` (${evidence.thresholds.unit})`}
            </p>
          ) : null}

          <div className="rounded-lg border border-border bg-background p-3">
            <SignalEvidenceChart evidence={evidence} />
          </div>

          {evidence.kind === "ranking" && evidence.ranking && evidence.ranking.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 text-sm" data-test-id="signal-evidence-ranking-table">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Ítem</th>
                    <th className="px-2 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.ranking.rows.slice(0, 12).map((row, i) => (
                    <tr key={`${row.label}-${i}`} className="border-b border-border/70">
                      <td className="px-2 py-2">
                        <span className="font-medium text-foreground">{row.label}</span>
                        {row.sublabel ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.sublabel}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                        {row.valueLabel ?? row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : !error ? (
        <LoadingState
          className="flex items-center justify-center py-12"
          label="Preparando"
        />
      ) : null}
    </Dialog>
  );
}
