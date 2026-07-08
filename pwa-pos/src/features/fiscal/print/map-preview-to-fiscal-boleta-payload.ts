import type { PosSaleTicketCompany } from "@kai/print-service-client";
import {
  FISCAL_BOLETA_PREVIEW_PAYLOAD_VERSION,
  shouldShowReceptorOnFiscalBoletaTicket,
} from "@kai/print-service-client";
import type { FiscalBoletaPreviewPayload } from "@kai/print-service-client";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";

function mapEmisorToCompany(emisor: FiscalBoletaPrintPreview["emisor"]): PosSaleTicketCompany {
  return {
    razonSocial: emisor.legalName?.trim() || "—",
    nombreFantasia: null,
    rut: emisor.rut,
    businessActivity: emisor.businessActivity,
  };
}

export function mapPreviewToFiscalBoletaPayload(
  preview: FiscalBoletaPrintPreview,
): FiscalBoletaPreviewPayload {
  return {
    version: FISCAL_BOLETA_PREVIEW_PAYLOAD_VERSION,
    caso: preview.caso,
    folio: preview.folio,
    issuedAt: preview.issuedAt,
    tipoDte: 39,
    isSimulated: preview.isSimulated,
    emisor: { ...preview.emisor },
    company: mapEmisorToCompany(preview.emisor),
    receptor: { ...preview.receptor },
    showReceptorOnTicket: shouldShowReceptorOnFiscalBoletaTicket(preview.receptor),
    lines: preview.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceWithIva: line.unitPriceWithIva,
      exempt: line.exempt,
      unitMeasure: line.unitMeasure,
      lineTotal: line.lineTotal,
    })),
    totals: { ...preview.totals },
    observation: preview.observation,
    timbrePdf417Payload: preview.timbrePdf417Payload,
    operatorName: preview.operatorName ?? null,
  };
}
