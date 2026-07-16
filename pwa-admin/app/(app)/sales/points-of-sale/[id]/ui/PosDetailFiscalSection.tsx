"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, LoadingState } from "@kai/ui";
import {
  getFiscalFolioSummaryAction,
  getPosFiscalPolicyAction,
  getPosFolioAllocationsAction,
  replacePosFiscalPolicyAction,
} from "@/features/sales-points-of-sale/actions/pos-fiscal.action";
import { PosFiscalSettingsEditor } from "@/features/sales-points-of-sale/ui/PosFiscalSettingsEditor";
import type { PosFiscalPolicy, PosFolioAllocation } from "@/features/sales-points-of-sale/types/pos-fiscal.types";

type Props = {
  posId: string;
  active: boolean;
};

export function PosDetailFiscalSection({ posId, active }: Props) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fiscalPolicy, setFiscalPolicy] = useState<PosFiscalPolicy | null>(null);
  const [fiscalAllocationsLoaded, setFiscalAllocationsLoaded] = useState<PosFolioAllocation[]>([]);
  const [companyCaf39, setCompanyCaf39] = useState<{
    rangeFrom: number;
    rangeTo: number;
    packageCode?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [policyRes, allocRes, summaryRes] = await Promise.all([
          getPosFiscalPolicyAction(posId),
          getPosFolioAllocationsAction(posId),
          getFiscalFolioSummaryAction(),
        ]);
        if (cancelled) return;
        if (policyRes.success) setFiscalPolicy(policyRes.policy);
        const boleta39 = summaryRes.success
          ? summaryRes.summaries.find((s) => s.dteType === 39)?.caf ?? null
          : null;
        setCompanyCaf39(
          boleta39
            ? {
                rangeFrom: boleta39.rangeFrom,
                rangeTo: boleta39.rangeTo,
                packageCode: boleta39.packageCode,
              }
            : null,
        );
        if (allocRes.success) setFiscalAllocationsLoaded(allocRes.allocations);
        setLoaded(true);
      } catch {
        if (!cancelled) setError("No se pudieron cargar los documentos tributarios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, loaded, posId]);

  const handleSave = () => {
    if (!fiscalPolicy) return;
    setError(null);
    setSuccess(null);
    startTransition(() => {
      void (async () => {
        const r = await replacePosFiscalPolicyAction(posId, fiscalPolicy);
        if (!r.success) {
          setError(r.error || "No se pudo guardar la política fiscal.");
          return;
        }
        setSuccess("Documentos tributarios guardados.");
        router.refresh();
      })();
    });
  };

  if (loading || !loaded) {
    return (
      <LoadingState className="flex items-center justify-center py-8" label="Cargando documentos tributarios" />
    );
  }

  if (!fiscalPolicy) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="pos-detail-fiscal-empty">
        No se pudo cargar la configuración fiscal.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pos-detail-fiscal">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <PosFiscalSettingsEditor
        posId={posId}
        initialPolicy={fiscalPolicy}
        initialAllocations={fiscalAllocationsLoaded}
        companyCaf39={companyCaf39}
        disabled={isPending}
        onChange={({ policy }) => setFiscalPolicy(policy)}
      />

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={isPending}
          data-test-id="pos-detail-fiscal-save"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
