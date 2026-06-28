"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog } from "@/shared/admin-shared";
import {
  describePosDocumentPrintMode,
  getPosDocumentPrintMode,
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  PosDocumentPrintModeSelector,
  type PosDocumentPrintMode,
} from "@kai/print-service-client";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import {
  buildCustomerCreditNoteReceiptHtml,
  printCustomerCreditNoteReceipt,
} from "@/features/customer-credit-notes/lib/customer-credit-note-receipt-print";
import {
  buildCustomerCreditNoteDocumentHtml,
  printCustomerCreditNoteDocument,
} from "@/features/customer-credit-notes/lib/customer-credit-note-document-print";
import { PosPrintDocumentPreview } from "@/features/pos-print/ui/PosPrintDocumentPreview";

type Props = {
  open: boolean;
  data: CustomerCreditNotePrintData | null;
  onClose: () => void;
};

export function PosCustomerCreditNoteDialog({ open, data, onClose }: Props) {
  const [printMode, setPrintMode] = useState<PosDocumentPrintMode>("ticket");
  const printedFolioRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      printedFolioRef.current = null;
      return;
    }
    setPrintMode(getPosDocumentPrintMode("customerCreditNote"));
  }, [open]);

  useEffect(() => {
    if (!open || !data?.creditNoteFolio?.trim()) return;
    const folio = data.creditNoteFolio.trim();
    if (printedFolioRef.current === folio) return;
    printedFolioRef.current = folio;
    const snapshot = data;
    const mode = getPosDocumentPrintMode("customerCreditNote");
    const format = posDocumentPrintModeToWireFormat(mode);
    const t = window.setTimeout(() => {
      if (isPosDocumentPrintModeDocument(mode)) {
        printCustomerCreditNoteDocument(snapshot, format);
      } else {
        printCustomerCreditNoteReceipt(snapshot, format);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [open, data]);

  const wireFormat = posDocumentPrintModeToWireFormat(printMode);

  const previewSrcDoc = useMemo(() => {
    if (!data || typeof window === "undefined") return null;
    const origin = window.location.origin;
    return isPosDocumentPrintModeDocument(printMode)
      ? buildCustomerCreditNoteDocumentHtml(data, wireFormat)
      : buildCustomerCreditNoteReceiptHtml(data, origin, wireFormat);
  }, [data, printMode, wireFormat]);

  const handleReprint = () => {
    if (!data) return;
    if (isPosDocumentPrintModeDocument(printMode)) {
      printCustomerCreditNoteDocument(data, wireFormat);
    } else {
      printCustomerCreditNoteReceipt(data, wireFormat);
    }
  };

  if (!data) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nota de crédito emitida"
      size="lg"
      scroll="paper"
      data-test-id="pos-customer-credit-note-dialog"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={handleReprint} data-test-id="pos-nc-dialog-reprint">
            Imprimir de nuevo
          </Button>
          <Button type="button" variant="primary" onClick={onClose} data-test-id="pos-nc-dialog-close">
            Volver al POS
          </Button>
        </>
      }
    >
      <div className="grid gap-2 text-sm">
        <p className="text-xs text-muted-foreground">
          Modo:{" "}
          <span className="font-medium text-foreground">{describePosDocumentPrintMode(printMode)}</span>
        </p>
        <PosDocumentPrintModeSelector
          value={printMode}
          onChange={setPrintMode}
          data-test-id="pos-nc-print-mode"
        />
        <PosPrintDocumentPreview
          html={previewSrcDoc}
          format={wireFormat}
          title="Vista previa nota de crédito"
          data-test-id="pos-nc-receipt-preview"
        />
      </div>
    </Dialog>
  );
}
