"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog } from "@kai/ui";
import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import {
  executeLaundryReceptionPrintPlan,
  formatLaundryReceptionPrintPlanErrors,
} from "@/features/laundry/lib/execute-laundry-reception-print-plan";
import type { LaundryReception } from "@/features/laundry/types/laundry.types";
import LaundryReceptionPreview from "@/features/laundry/ui/LaundryReceptionPreview";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";
import { PosPrintPreviewReprintButton } from "@/features/pos-print/ui/PosPrintPreviewReprintButton";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";

export type LaundryReceptionSuccessPayload = {
  reception: LaundryReception;
  serviceNamesByVariantId: Record<string, string>;
  garmentTypeNamesById: Record<string, string>;
  /** null = pickup sin cobro. */
  saleReceipt: PosSaleReceiptData | null;
  company?: CompanyDetails | null;
};

type DialogProps = {
  open: boolean;
  data: LaundryReceptionSuccessPayload | null;
  onClose: () => void;
  closeLabel?: string;
};

function salePrintArgsFromReceipt(receipt: PosSaleReceiptData): {
  printPlan: SalePrintPlan;
  receipt: PosSaleReceiptData;
  ticketReceipt: PosSaleReceiptData | null;
} {
  const printPlan = receipt.printPlan ?? "TICKET_ONLY";
  const ticketReceipt =
    printPlan === "BOLETA_AND_TICKET"
      ? receipt.ticketPrintPreview ?? null
      : printPlan === "TICKET_ONLY"
        ? receipt.ticketPrintPreview ?? receipt
        : null;
  return { printPlan, receipt, ticketReceipt };
}

async function enrichSaleReceiptForPrint(
  snapshot: PosSaleReceiptData,
): Promise<PosSaleReceiptData> {
  const printPlan = snapshot.printPlan ?? "TICKET_ONLY";
  if (
    (printPlan !== "BOLETA_ONLY" && printPlan !== "BOLETA_AND_TICKET") ||
    snapshot.fiscalPrintPreview
  ) {
    return snapshot;
  }
  const txId = snapshot.transactionId?.trim();
  if (!txId || !shouldUseBackendApi()) return snapshot;
  try {
    const { getFiscalBoletaPrintPreviewAction } = await import(
      "@/features/fiscal/actions/reprint-fiscal-boleta.action"
    );
    const res = await getFiscalBoletaPrintPreviewAction(txId);
    if (res.success) {
      return { ...snapshot, fiscalPrintPreview: res.preview };
    }
  } catch {
    /* sin preview remota */
  }
  return snapshot;
}

export function LaundryReceptionSuccessDialog({
  open,
  data,
  onClose,
  closeLabel = "Ver guía",
}: DialogProps) {
  const autoPrintForCodeRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [autoPrintStatus, setAutoPrintStatus] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [saleReceipt, setSaleReceipt] = useState<PosSaleReceiptData | null>(
    data?.saleReceipt ?? null,
  );

  useEffect(() => {
    setSaleReceipt(data?.saleReceipt ?? null);
  }, [data?.reception.id, data?.saleReceipt?.folio, data?.saleReceipt?.transactionId]);

  useEffect(() => {
    if (!open) {
      setAutoPrintStatus(null);
      autoPrintForCodeRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !data) return;
    const code = data.reception.code?.trim() || data.reception.id;
    if (!code || autoPrintForCodeRef.current === code) return;
    autoPrintForCodeRef.current = code;
    const t = window.setTimeout(() => {
      void (async () => {
        const payload = dataRef.current;
        if (!payload) return;
        setPrintBusy(true);
        try {
          let sale = payload.saleReceipt;
          if (sale) {
            sale = await enrichSaleReceiptForPrint(sale);
            setSaleReceipt(sale);
          }
          const printResult = await executeLaundryReceptionPrintPlan({
            reception: payload.reception,
            serviceNamesByVariantId: payload.serviceNamesByVariantId,
            garmentTypeNamesById: payload.garmentTypeNamesById,
            sale: sale ? salePrintArgsFromReceipt(sale) : null,
          });
          const printErr = formatLaundryReceptionPrintPlanErrors(printResult);
          setAutoPrintStatus(printErr);
          if (printErr) {
            console.warn("[KaiStore print] lavandería éxito:", printErr);
          }
        } catch (e) {
          const raw = e instanceof Error ? e.message : "print_failed";
          setAutoPrintStatus(
            `No se pudo enviar la guía al agente. ${raw} Usá «Imprimir de nuevo».`,
          );
        } finally {
          setPrintBusy(false);
        }
      })();
    }, 100);
    return () => clearTimeout(t);
  }, [open, data?.reception.id, data?.reception.code]);

  async function handleReprint(): Promise<void> {
    const payload = dataRef.current;
    if (!payload) return;
    setPrintBusy(true);
    try {
      let sale = saleReceipt ?? payload.saleReceipt;
      if (sale) {
        sale = await enrichSaleReceiptForPrint(sale);
        setSaleReceipt(sale);
      }
      const printResult = await executeLaundryReceptionPrintPlan({
        reception: payload.reception,
        serviceNamesByVariantId: payload.serviceNamesByVariantId,
        garmentTypeNamesById: payload.garmentTypeNamesById,
        sale: sale ? salePrintArgsFromReceipt(sale) : null,
      });
      setAutoPrintStatus(formatLaundryReceptionPrintPlanErrors(printResult));
    } catch (e) {
      const raw = e instanceof Error ? e.message : "print_failed";
      setAutoPrintStatus(`No se pudo reimprimir. ${raw}`);
    } finally {
      setPrintBusy(false);
    }
  }

  if (!data) return null;

  const isDeposit = data.reception.paymentMode === "DEPOSIT_THEN_BALANCE" && Boolean(saleReceipt);
  const isFullPay =
    Boolean(saleReceipt) && data.reception.paymentMode === "FULL_ON_RECEIVE";
  const dialogTitle = isDeposit
    ? "Abono registrado"
    : isFullPay || saleReceipt
      ? "Cobro registrado"
      : "Recepción registrada";
  const reprintLabel = saleReceipt ? "Imprimir ambos" : "Imprimir guía";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      size="lg"
      scroll="paper"
      data-test-id="laundry-reception-success-dialog"
      actions={
        <>
          <PosPrintPreviewReprintButton
            onClick={() => void handleReprint()}
            disabled={printBusy}
            isLoading={printBusy}
            title={reprintLabel}
            data-test-id="laundry-reception-reprint"
          />
          <Button type="button" variant="primary" onClick={onClose}>
            {closeLabel}
          </Button>
        </>
      }
    >
      <LaundryReceptionPreview
        reception={data.reception}
        serviceNamesByVariantId={data.serviceNamesByVariantId}
        garmentTypeNamesById={data.garmentTypeNamesById}
        company={data.company}
        saleReceipt={saleReceipt}
        statusMessage={autoPrintStatus}
        data-test-id="laundry-reception-success-preview"
      />
    </Dialog>
  );
}

export default LaundryReceptionSuccessDialog;
