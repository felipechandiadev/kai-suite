"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, IconButton, LoadingState, usePrint } from "@kai/ui";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import { getRemunerationDetailAction } from "@/features/hr-remunerations/actions/remuneration.action";
import type { RemunerationGridRow } from "@/features/hr-remunerations/types/remuneration.types";
import type { PrintableCompanyInfo } from "@/shared/components/PrintDocuments/PrintableDocumentLayout";
import { PayrollSettlementPrintDocument } from "@/features/hr-remunerations/print/PayrollSettlementPrintDocument";
import { printableCompanyFromDetails } from "@/features/hr-remunerations/print/printable-company-from-details";

export type PayrollSettlementPrintDialogProps = {
  open: boolean;
  remunerationId: string | null;
  onClose: () => void;
};

export function PayrollSettlementPrintDialog({
  open,
  remunerationId,
  onClose,
}: PayrollSettlementPrintDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<PrintableCompanyInfo | null>(null);
  const [settlement, setSettlement] = useState<RemunerationGridRow | null>(null);

  const folio =
    settlement?.documentNumber != null && String(settlement.documentNumber).trim()
      ? String(settlement.documentNumber).trim()
      : remunerationId?.slice(0, 8) ?? "liquidacion";

  const { contentRef, handlePrint } = usePrint(
    `liquidacion-sueldo-${folio}`,
    "A4",
    "portrait",
  );

  const canPrint = !loading && !error && Boolean(company) && Boolean(settlement);

  useEffect(() => {
    if (!open || !remunerationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSettlement(null);
    setCompany(null);

    void (async () => {
      try {
        const [companyDetails, detailRes] = await Promise.all([
          getCompanyDetailsAction(),
          getRemunerationDetailAction(remunerationId),
        ]);
        if (cancelled) return;
        if (!detailRes.success) {
          setError(detailRes.error);
          return;
        }
        setCompany(printableCompanyFromDetails(companyDetails));
        setSettlement(detailRes.data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar la vista previa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, remunerationId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vista previa de liquidación"
      size="xl"
      fullWidth
      maxWidth={960}
      scroll="paper"
      maxHeight="min(92vh, 900px)"
      data-test-id="payroll-settlement-print-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="payroll-settlement-print-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose}>
            Cerrar
          </Button>
          <IconButton
            icon="Printer"
            variant="action"
            size="md"
            disabled={!canPrint}
            title="Imprimir"
            ariaLabel="Imprimir liquidación"
            onClick={() => handlePrint()}
            data-test-id="payroll-settlement-print-button"
          />
        </>
      }
      actionsJustify="end"
    >
      <div ref={contentRef} data-test-id="payroll-settlement-print-content">
        {loading ? (
          <LoadingState
            className="flex items-center justify-center py-10"
            label="Cargando liquidación"
          />
        ) : company && settlement ? (
          <PayrollSettlementPrintDocument company={company} settlement={settlement} />
        ) : !error ? (
          <LoadingState
            className="flex items-center justify-center py-10"
            label="Preparando documento"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
