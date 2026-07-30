"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, LoadingState } from "@kai/ui";
import { getCompanyPaymentMethodsAction } from "@/features/companies/actions/companies-payment-methods.action";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import {
  getPosPaymentMethodsAction,
  replacePosPaymentMethodsAction,
} from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";
import type { CompanyPaymentMethodConfig } from "@/features/companies/types/company-payment-methods.types";
import {
  syncPosPaymentDraftWithCatalog,
  type PosPaymentMethodConfig,
} from "@/features/sales-points-of-sale/types/pos-payment-methods.types";
import {
  PosPaymentMethodsCardsEditor,
  type PosPaymentMethodsCardsEditorHandle,
} from "../../components/PosPaymentMethodsCardsEditor";

type Props = {
  posId: string;
  companyId: string | null;
  active: boolean;
};

function resolveSavePayload(
  editor: PosPaymentMethodsCardsEditorHandle | null,
  draft: PosPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  const fromEditor = editor?.getPayload();
  if (fromEditor != null && fromEditor.length > 0) {
    return fromEditor;
  }
  return draft;
}

export function PosDetailPaymentMethodsSection({ posId, companyId, active }: Props) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [paymentCatalog, setPaymentCatalog] = useState<CompanyPaymentMethodConfig[]>([]);
  const [posPaymentDraft, setPosPaymentDraft] = useState<PosPaymentMethodConfig[]>([]);
  const [bankAccountOptions, setBankAccountOptions] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const paymentEditorRef = useRef<PosPaymentMethodsCardsEditorHandle>(null);

  const resolvedCompanyId = (companyId ?? "").trim();

  const loadPaymentMethods = useCallback(async () => {
    if (!resolvedCompanyId) return;
    setLoading(true);
    setEditorReady(false);
    setError(null);
    try {
      const [catalogRes, posRes, details] = await Promise.all([
        getCompanyPaymentMethodsAction(resolvedCompanyId),
        getPosPaymentMethodsAction(posId),
        getCompanyDetailsAction(),
      ]);
      if (catalogRes.success) {
        setPaymentCatalog(catalogRes.paymentMethods);
        if (posRes.success) {
          setPosPaymentDraft(
            syncPosPaymentDraftWithCatalog(catalogRes.paymentMethods, posRes.paymentMethods),
          );
        } else {
          setPosPaymentDraft(syncPosPaymentDraftWithCatalog(catalogRes.paymentMethods, []));
        }
      } else if (posRes.success) {
        setPosPaymentDraft(posRes.paymentMethods);
      }
      if (details?.bankAccounts?.length) {
        setBankAccountOptions(
          details.bankAccounts
            .map((a) => {
              const key =
                a.accountKey != null && String(a.accountKey).trim()
                  ? String(a.accountKey)
                  : null;
              if (!key) return null;
              return { id: key, label: `${a.bankName} · ${a.accountNumber}` };
            })
            .filter((x): x is { id: string; label: string } => Boolean(x)),
        );
      }
      setLoaded(true);
    } catch {
      setError("No se pudieron cargar los medios de pago.");
    } finally {
      setLoading(false);
    }
  }, [posId, resolvedCompanyId]);

  useEffect(() => {
    if (!active || loaded || !resolvedCompanyId) return;
    void loadPaymentMethods();
  }, [active, loaded, resolvedCompanyId, loadPaymentMethods]);

  useEffect(() => {
    if (!active) {
      setEditorReady(false);
    }
  }, [active]);

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    const payload = resolveSavePayload(paymentEditorRef.current, posPaymentDraft);
    if (payload.length === 0) {
      setError("No hay medios de pago listos para guardar. Espera a que termine de cargar el editor.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await replacePosPaymentMethodsAction(posId, payload);
        if (!r.success) {
          setError(r.error || "No se pudieron guardar los medios de pago.");
          return;
        }
        setSuccess("Medios de pago guardados.");
        setLoaded(false);
        setEditorReady(false);
        await loadPaymentMethods();
        router.refresh();
      })();
    });
  };

  if (!resolvedCompanyId) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="pos-detail-payments-no-company">
        Empresa no determinada para este punto de venta.
      </p>
    );
  }

  if (loading || !loaded) {
    return <LoadingState className="flex items-center justify-center py-8" label="Cargando medios de pago" />;
  }

  const canSave = editorReady && !isPending;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pos-detail-payments">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <p className="text-sm text-muted-foreground">
        Configura qué medios están habilitados, cuáles se precargan y el orden (arrastrando).
      </p>

      <PosPaymentMethodsCardsEditor
        ref={paymentEditorRef}
        catalog={paymentCatalog}
        value={posPaymentDraft}
        onChange={setPosPaymentDraft}
        onReady={() => setEditorReady(true)}
        bankAccountOptions={bankAccountOptions}
        disabled={isPending}
        data-test-id="pos-detail-payment-methods"
      />

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={!canSave}
          data-test-id="pos-detail-payments-save"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
