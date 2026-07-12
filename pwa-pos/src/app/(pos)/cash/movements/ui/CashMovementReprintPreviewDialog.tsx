"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog, DotProgress } from "@kai/ui";
import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  getPosDocumentPrintMode,
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  type PosDocumentPrintMode,
} from "@kai/print-service-client";
import { fiscalTimbrePdf417SvgForPreview } from "@/features/fiscal/print/fiscal-timbre-pdf417";
import {
  loadReprintBundle,
  reprintSaleDocument,
  reprintSaleReceipt,
  reprintSaleTicket,
} from "@/features/pos-print/lib/reprint-sale-receipt";
import { PosPrintPreviewReprintButton } from "@/features/pos-print/ui/PosPrintPreviewReprintButton";
import { PosSaleReceiptPreview } from "@/features/pos-print/ui/PosSaleReceiptPreview";

type CashMovementReprintPreviewDialogProps = {
  open: boolean;
  transactionId: string | null;
  documentNumber?: string | null;
  onClose: () => void;
  onPrintNotice?: (message: string | null) => void;
};

function resolveInitialPrintMode(data: PosSaleReceiptData): PosDocumentPrintMode {
  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  return getPosDocumentPrintMode(kind);
}

export function CashMovementReprintPreviewDialog({
  open,
  transactionId,
  documentNumber,
  onClose,
  onPrintNotice,
}: CashMovementReprintPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<PosSaleReceiptData | null>(null);
  const [printMode, setPrintMode] = useState<PosDocumentPrintMode>("ticket");
  const [printBusy, setPrintBusy] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [documentFiscalTimbreSvg, setDocumentFiscalTimbreSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transactionId?.trim()) {
      setReceiptData(null);
      setLoadError(null);
      setPrintStatus(null);
      setDocumentFiscalTimbreSvg(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const bundle = await loadReprintBundle(transactionId.trim());
      if (cancelled) return;
      setLoading(false);
      if (!bundle.success) {
        setReceiptData(null);
        setLoadError(bundle.message);
        return;
      }
      setReceiptData(bundle.full);
      setPrintMode(resolveInitialPrintMode(bundle.full));
    })();

    return () => {
      cancelled = true;
    };
  }, [open, transactionId]);

  useEffect(() => {
    if (!receiptData || !isPosDocumentPrintModeDocument(printMode)) {
      setDocumentFiscalTimbreSvg(null);
      return;
    }

    const printPlan = receiptData.printPlan ?? "TICKET_ONLY";
    const isBoletaPlan = printPlan === "BOLETA_ONLY" || printPlan === "BOLETA_AND_TICKET";
    const preview = receiptData.fiscalPrintPreview;
    if (!isBoletaPlan || !preview) {
      setDocumentFiscalTimbreSvg(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const svg = await fiscalTimbrePdf417SvgForPreview(
        preview,
        posDocumentPrintModeToWireFormat(printMode),
      );
      if (!cancelled) {
        setDocumentFiscalTimbreSvg(svg.trim() || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptData, printMode]);

  const handlePrint = useCallback(async () => {
    const txId = transactionId?.trim();
    if (!txId || !receiptData) return;
    setPrintBusy(true);
    setPrintStatus(null);
    onPrintNotice?.(null);
    try {
      const printPlan = receiptData.printPlan ?? "TICKET_ONLY";
      const showingFiscalBoletaPreview = Boolean(receiptData.fiscalPrintPreview);
      const showingDualPreview =
        printPlan === "BOLETA_AND_TICKET" && Boolean(receiptData.ticketPrintPreview);

      let res: { success: boolean; message?: string; channel?: "agent" | "browser" };
      if (showingFiscalBoletaPreview || showingDualPreview) {
        res = await reprintSaleReceipt(txId);
      } else if (isPosDocumentPrintModeDocument(printMode)) {
        res = await reprintSaleDocument(txId);
      } else {
        res = await reprintSaleTicket(txId);
      }

      if (!res.success) {
        const msg = res.message ?? "No se pudo reimprimir el comprobante";
        setPrintStatus(msg);
        onPrintNotice?.(msg);
        return;
      }
      onPrintNotice?.("Comprobante enviado a impresión.");
      onClose();
    } finally {
      setPrintBusy(false);
    }
  }, [onClose, onPrintNotice, printMode, receiptData, transactionId]);

  const title = documentNumber?.trim()
    ? `Reimprimir ${documentNumber.trim()}`
    : "Reimprimir comprobante";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      scroll="paper"
      data-test-id="cash-movement-reprint-dialog"
      actions={
        <>
          <PosPrintPreviewReprintButton
            onClick={() => void handlePrint()}
            disabled={!receiptData || printBusy || loading}
            isLoading={printBusy}
            title="Imprimir comprobante"
            data-test-id="cash-movement-reprint-print"
          />
          <Button type="button" variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center py-12">
          <DotProgress />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive" data-test-id="cash-movement-reprint-error">
          {loadError}
        </p>
      ) : receiptData ? (
        <PosSaleReceiptPreview
          data={receiptData}
          printMode={printMode}
          onPrintModeChange={setPrintMode}
          documentFiscalTimbreSvg={documentFiscalTimbreSvg}
          statusMessage={printStatus}
          data-test-id="cash-movement-reprint-preview"
        />
      ) : null}
    </Dialog>
  );
}
