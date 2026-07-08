import { buildTedStamp } from "@kai/fiscal-ted";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";

function splitLineAmounts(
  quantity: number,
  unitPriceWithIva: number,
  exempt: boolean,
): { lineNet: number; lineExe: number; lineIva: number; lineTotal: number } {
  const lineTotal = quantity * unitPriceWithIva;
  if (exempt) {
    return { lineNet: 0, lineExe: lineTotal, lineIva: 0, lineTotal };
  }
  const lineNet = Math.round(lineTotal / 1.19);
  const lineIva = lineTotal - lineNet;
  return { lineNet, lineExe: 0, lineIva, lineTotal };
}

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

function mapCartLine(line: PosCartLine) {
  const qty = Number(line.quantity) || 0;
  const unitGross = Number(line.unitPriceWithTax) || 0;
  const taxRate = Number(line.unitTaxRate) || 0;
  const taxAmount = Math.round(Math.max(0, unitGross - (Number(line.unitPrice) || 0)) * qty);
  const exempt = taxRate === 0 && taxAmount === 0;
  const name =
    formatReceiptLineDisplayName(line.productName ?? "", line.attributes) ||
    line.sku?.trim() ||
    "Item";
  return {
    name: name.slice(0, 80),
    quantity: qty,
    unitPriceWithIva: unitGross,
    exempt,
    unitMeasure: "UN",
  };
}

export function buildOfflineBoletaPreview(input: {
  cartLines: PosCartLine[];
  customer: PosSaleCustomer | null;
  fiscalPack: OfflineFiscalPack;
  folio: number;
  localDocumentNumber: string;
  operatorName?: string | null;
}): { tedXml: string; issuedAt: string; preview: FiscalBoletaPrintPreview } {
  const docLines = input.cartLines.map(mapCartLine);
  if (!docLines.length) {
    throw new Error("Carrito vacío");
  }

  let mntNeto = 0;
  let mntExe = 0;
  let iva = 0;
  let mntTotal = 0;
  const previewLines = docLines.map((line) => {
    const amounts = splitLineAmounts(line.quantity, line.unitPriceWithIva, line.exempt);
    mntNeto += amounts.lineNet;
    mntExe += amounts.lineExe;
    iva += amounts.lineIva;
    mntTotal += amounts.lineTotal;
    return {
      name: line.name,
      quantity: line.quantity,
      unitPriceWithIva: line.unitPriceWithIva,
      exempt: line.exempt,
      unitMeasure: line.unitMeasure,
      lineNet: amounts.lineNet,
      lineExe: amounts.lineExe,
      lineIva: amounts.lineIva,
      lineTotal: amounts.lineTotal,
    };
  });

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
    mntTotal,
    primerItem: docLines[0]?.name ?? "Item",
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
    totals: { mntNeto, mntExe, iva, mntTotal },
    observation: null,
    operatorName: input.operatorName ?? null,
  };

  return { tedXml, issuedAt, preview };
}
