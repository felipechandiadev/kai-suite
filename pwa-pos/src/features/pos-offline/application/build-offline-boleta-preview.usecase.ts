import { buildTedStamp } from "@kai/fiscal-ted";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";
import { buildDteBoletaLinesFromCart } from "@/features/sale-print-plan/build-dte-boleta-lines-from-cart";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";

function formatChileanRut(raw: string): string | null {
  const cleaned = raw.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  if (!cleaned) return null;
  if (/^\d{7,8}-[\dK]$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/[^0-9K]/g, "");
  if (digits.length < 8) return null;
  const dv = digits.slice(-1);
  const body = digits.slice(0, -1);
  if (body.length < 7) return null;
  return `${body}-${dv}`;
}

function resolveReceptor(customer: PosSaleCustomer | null): { rut: string; name: string } {
  const doc = customer?.document?.trim() ?? "";
  const rut = formatChileanRut(doc);
  if (rut) {
    const name = customer?.name?.trim() || "Cliente";
    return { rut, name: name.slice(0, 100) };
  }
  return { rut: "66666666-6", name: "Cliente" };
}

function mapLineName(line: PosCartLine): string {
  const attrBits = (
    line.attributes?.map((a) => {
      if (typeof a === "string") return a.trim();
      return String(a.attributeValue ?? "").trim();
    }) ?? []
  ).filter(Boolean);
  return (
    formatReceiptLineDisplayName(line.productName ?? "", attrBits) ||
    line.sku?.trim() ||
    "Item"
  );
}

export function buildOfflineBoletaPreview(input: {
  cartLines: PosCartLine[];
  customer: PosSaleCustomer | null;
  fiscalPack: OfflineFiscalPack;
  folio: number;
  localDocumentNumber: string;
  operatorName?: string | null;
  orderDiscount?: number;
}): { tedXml: string; issuedAt: string; preview: FiscalBoletaPrintPreview } {
  const { previewLines, totals } = buildDteBoletaLinesFromCart({
    cartLines: input.cartLines,
    orderDiscount: input.orderDiscount ?? 0,
    mapLineName,
  });

  if (!previewLines.length) {
    throw new Error("Sin líneas tributarias para boleta offline");
  }

  const receptor = resolveReceptor(input.customer);
  const issuedAt = new Date().toISOString().slice(0, 10);
  const emisor = input.fiscalPack.emisor;
  const rutEmisor = emisor.rut?.trim();
  if (!rutEmisor) {
    throw new Error("Emisor incompleto en paquete fiscal offline");
  }

  const tedXml = buildTedStamp({
    rutEmisor,
    tipoDte: 39,
    folio: input.folio,
    fechaEmision: issuedAt,
    rutReceptor: receptor.rut,
    razonSocialReceptor: receptor.name,
    mntTotal: totals.mntTotal,
    primerItem: previewLines[0]?.name ?? "Item",
    cafXml: input.fiscalPack.cafXml,
  });

  const emisorComplete = !!(
    emisor.rut &&
    emisor.legalName &&
    emisor.businessActivity &&
    emisor.address &&
    emisor.commune &&
    emisor.city &&
    emisor.resolutionNumber &&
    emisor.resolutionDate
  );

  const preview: FiscalBoletaPrintPreview = {
    caso: input.localDocumentNumber,
    folio: input.folio,
    issuedAt,
    tipoDte: 39,
    isSimulated: false,
    timbrePdf417Payload: tedXml,
    emisor,
    emisorComplete,
    receptor,
    lines: previewLines,
    totals,
    observation: null,
    operatorName: input.operatorName ?? null,
  };

  return { tedXml, issuedAt, preview };
}
