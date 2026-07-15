"use client";

import { useEffect, useMemo, useState } from "react";
import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { buildFiscalBoletaPreviewHtml } from "@/features/fiscal/print/build-fiscal-boleta-preview-html";
import { fiscalTimbrePdf417SvgForPreview } from "@/features/fiscal/print/fiscal-timbre-pdf417";
import {
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  PosDocumentPrintModeSelector,
  type PosDocumentPrintMode,
  type PrintFormat,
} from "@kai/print-service-client";
import { buildPosSaleDocumentHtml } from "@/features/pos-print/lib/pos-sale-document-print";
import { buildPosSaleReceiptHtml } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { PosPrintDocumentPreview } from "@/features/pos-print/ui/PosPrintDocumentPreview";
import { PosSalePaymentSummaryStrip } from "@/features/pos-print/ui/PosSalePaymentSummaryStrip";

const FISCAL_BOLETA_PREVIEW_FORMAT: PrintFormat = "ticket_80mm";

export type PosSaleReceiptPreviewProps = {
  data: PosSaleReceiptData;
  printMode: PosDocumentPrintMode;
  onPrintModeChange?: (mode: PosDocumentPrintMode) => void;
  /** SVG del timbre PDF417 para documento/hoja de boleta (opcional). */
  documentFiscalTimbreSvg?: string | null;
  showModeSelector?: boolean;
  statusMessage?: string | null;
  "data-test-id"?: string;
};

export function PosSaleReceiptPreview({
  data,
  printMode,
  onPrintModeChange,
  documentFiscalTimbreSvg = null,
  showModeSelector = true,
  statusMessage = null,
  "data-test-id": dataTestId = "pos-sale-receipt-preview-root",
}: PosSaleReceiptPreviewProps) {
  const fiscalPrintPreview = data.fiscalPrintPreview ?? null;
  const ticketPrintPreview = data.ticketPrintPreview ?? null;
  const printPlan = data.printPlan ?? "TICKET_ONLY";
  const showingFiscalBoletaPreview = Boolean(fiscalPrintPreview);
  const showingDualPreview = printPlan === "BOLETA_AND_TICKET" && Boolean(ticketPrintPreview);
  const [fiscalBoletaPreviewHtml, setFiscalBoletaPreviewHtml] = useState<string | null>(null);

  const ticketPreviewHtml = useMemo(() => {
    if (!ticketPrintPreview || typeof window === "undefined") return null;
    return buildPosSaleReceiptHtml(ticketPrintPreview, window.location.origin, "ticket_80mm", {
      showLogo: false,
    });
  }, [ticketPrintPreview]);

  useEffect(() => {
    if (!fiscalPrintPreview) {
      setFiscalBoletaPreviewHtml(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const pdf417Svg = await fiscalTimbrePdf417SvgForPreview(
        fiscalPrintPreview,
        FISCAL_BOLETA_PREVIEW_FORMAT,
      );
      if (cancelled) return;
      setFiscalBoletaPreviewHtml(
        buildFiscalBoletaPreviewHtml(fiscalPrintPreview, FISCAL_BOLETA_PREVIEW_FORMAT, pdf417Svg),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [fiscalPrintPreview]);

  const wireFormat = showingFiscalBoletaPreview
    ? FISCAL_BOLETA_PREVIEW_FORMAT
    : posDocumentPrintModeToWireFormat(printMode);
  const isDocument = !showingFiscalBoletaPreview && isPosDocumentPrintModeDocument(printMode);

  const previewSrcDoc = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (fiscalPrintPreview) {
      return fiscalBoletaPreviewHtml;
    }
    return isDocument
      ? buildPosSaleDocumentHtml(data, wireFormat, {
          fiscalTimbreSvg: documentFiscalTimbreSvg ?? undefined,
        })
      : buildPosSaleReceiptHtml(data, window.location.origin, wireFormat, { showLogo: false });
  }, [
    data,
    fiscalPrintPreview,
    fiscalBoletaPreviewHtml,
    isDocument,
    wireFormat,
    documentFiscalTimbreSvg,
  ]);

  return (
    <div className="grid gap-4 text-sm" data-test-id={dataTestId}>
      <PosSalePaymentSummaryStrip data={data} />
      {showingDualPreview ? (
        <p className="text-xs text-muted-foreground">
          Venta mixta: comprobante tributario (SII) + ticket interno (ítems no tributarios).
        </p>
      ) : showingFiscalBoletaPreview ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Comprobante:{" "}
          <span className="font-medium text-foreground">
            Boleta electrónica SII
            {data.fiscalFolio?.trim() ? ` · folio ${data.fiscalFolio.trim()}` : ""}
          </span>
        </p>
      ) : showModeSelector && onPrintModeChange ? (
        <PosDocumentPrintModeSelector
          value={printMode}
          onChange={onPrintModeChange}
          data-test-id="pos-sale-receipt-print-format"
        />
      ) : null}
      {statusMessage ? (
        <p className="text-sm text-destructive" data-test-id="pos-sale-print-status">
          {statusMessage}
        </p>
      ) : null}
      {showingFiscalBoletaPreview ? (
        <PosPrintDocumentPreview
          html={fiscalBoletaPreviewHtml}
          format={FISCAL_BOLETA_PREVIEW_FORMAT}
          title="Vista previa boleta SII"
          loadingLabel="Preparando vista previa de boleta…"
          data-test-id="pos-sale-receipt-fiscal-preview"
        />
      ) : null}
      {showingDualPreview && ticketPreviewHtml ? (
        <PosPrintDocumentPreview
          html={ticketPreviewHtml}
          format="ticket_80mm"
          title="Vista previa ticket interno (no tributario)"
          loadingLabel="Preparando ticket complementario…"
          data-test-id="pos-sale-receipt-ticket-preview"
        />
      ) : null}
      {!showingFiscalBoletaPreview && !showingDualPreview ? (
        <PosPrintDocumentPreview
          html={previewSrcDoc}
          format={wireFormat}
          title={isDocument ? "Vista previa documento" : "Vista previa ticket"}
          loadingLabel="Preparando vista previa…"
          data-test-id="pos-sale-receipt-preview"
        />
      ) : null}
    </div>
  );
}
