"use client";

import { useEffect, useMemo, useState } from "react";
import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { buildLaundryReceptionTicketHtml } from "@/features/laundry/lib/laundry-reception-receipt-print";
import { laundryReceptionToTicketInput } from "@/features/laundry/lib/laundry-reception-ticket-agent";
import type { LaundryReception } from "@/features/laundry/types/laundry.types";
import { PosPrintDocumentPreview } from "@/features/pos-print/ui/PosPrintDocumentPreview";
import { PosSaleReceiptPreview } from "@/features/pos-print/ui/PosSaleReceiptPreview";
import {
  getPosDocumentPrintMode,
  type PosDocumentPrintMode,
} from "@kai/print-service-client";

export type LaundryReceptionPreviewProps = {
  reception: LaundryReception;
  serviceNamesByVariantId?: Record<string, string>;
  garmentTypeNamesById?: Record<string, string>;
  company?: CompanyDetails | null;
  /** Si hay cobro en el mismo registro, preview del ticket/boleta debajo de la guía. */
  saleReceipt?: PosSaleReceiptData | null;
  statusMessage?: string | null;
  "data-test-id"?: string;
};

export default function LaundryReceptionPreview({
  reception,
  serviceNamesByVariantId = {},
  garmentTypeNamesById = {},
  company: companyProp = null,
  saleReceipt = null,
  statusMessage = null,
  "data-test-id": dataTestId = "laundry-reception-preview-root",
}: LaundryReceptionPreviewProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(companyProp);
  const [salePrintMode, setSalePrintMode] = useState<PosDocumentPrintMode>("ticket");

  useEffect(() => {
    if (companyProp) {
      setCompany(companyProp);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const details = (await getCompanyDetailsAction()) ?? null;
        if (!cancelled) setCompany(details);
      } catch {
        if (!cancelled) setCompany(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyProp]);

  useEffect(() => {
    if (saleReceipt) {
      setSalePrintMode(
        getPosDocumentPrintMode(
          saleReceipt.documentKind === "backorder" ? "backorder" : "sale",
        ),
      );
    }
  }, [saleReceipt?.folio, saleReceipt?.documentKind]);

  const guideHtml = useMemo(() => {
    if (typeof window === "undefined") return null;
    const input = laundryReceptionToTicketInput(
      reception,
      null,
      company,
      serviceNamesByVariantId,
      garmentTypeNamesById,
    );
    return buildLaundryReceptionTicketHtml(input, window.location.origin, "ticket_80mm");
  }, [reception, company, serviceNamesByVariantId, garmentTypeNamesById]);

  const hasSale = Boolean(saleReceipt);

  return (
    <div className="grid gap-4 text-sm" data-test-id={dataTestId}>
      {statusMessage ? (
        <p className="text-sm text-destructive" data-test-id="laundry-reception-print-status">
          {statusMessage}
        </p>
      ) : null}
      {hasSale ? (
        <p className="text-xs text-muted-foreground">
          Guía de recepción + comprobante de cobro.
        </p>
      ) : null}
      <PosPrintDocumentPreview
        html={guideHtml}
        format="ticket_80mm"
        title="Vista previa guía de recepción"
        loadingLabel="Preparando vista previa de la guía…"
        data-test-id="laundry-reception-guide-preview"
      />
      {saleReceipt ? (
        <PosSaleReceiptPreview
          data={saleReceipt}
          printMode={salePrintMode}
          onPrintModeChange={setSalePrintMode}
          showModeSelector={false}
          data-test-id="laundry-reception-sale-preview"
        />
      ) : null}
    </div>
  );
}
