import { describe, expect, it } from "vitest";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { allocateOrderDiscount } from "../allocate-order-discount";
import { classifySaleLines } from "../classify-sale-lines";
import { buildSalePrintJobs } from "../build-sale-print-jobs";
import { buildTicketReceiptDataFromCart } from "../build-ticket-receipt-data";
import { resolvePrintPlan } from "../resolve-print-plan";
import {
  resolveEffectiveSaleDocumentKind,
  boletaReducedToTicketMessage,
} from "../resolve-effective-sale-document-kind";
import { buildDteBoletaLinesFromCart } from "../build-dte-boleta-lines-from-cart";
import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";

function cartLine(partial: Partial<PosCartLine> & Pick<PosCartLine, "variantId">): PosCartLine {
  return {
    productId: "p1",
    productName: partial.productName ?? "Item",
    productDescription: null,
    productImageUrl: null,
    sku: null,
    barcode: null,
    unitSymbol: "UN",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 19,
    unitTaxAmount: 190,
    unitPriceWithTax: partial.unitPriceWithTax ?? 1190,
    trackInventory: false,
    availableStock: null,
    availableStockBase: null,
    attributes: [],
    metadata: null,
    taxCategory: "TAX_STANDARD",
    requiresDte: partial.requiresDte ?? true,
    taxIds: [],
    quantity: partial.quantity ?? 1,
    discount: partial.discount ?? null,
    ...partial,
  };
}

const baseReceipt = (): PosSaleReceiptData => ({
  folio: "SALE-1",
  issuedAtIso: new Date().toISOString(),
  documentKind: "sale",
  company: {
    razonSocial: "Demo",
    nombreFantasia: null,
    rut: null,
    businessActivity: null,
    logoUrl: null,
  },
  pos: { pointOfSaleName: null, branchName: null, priceListLabel: null },
  customer: null,
  quotation: null,
  lines: [],
  promotions: [],
  totals: {
    subtotalNet: 0,
    subtotalGross: 0,
    taxes: 0,
    lineDiscounts: 0,
    orderDiscount: 0,
    discountsTotal: 0,
    total: 0,
    paid: 5000,
    change: 0,
  },
  payments: [{ label: "Efectivo", amount: 5000, reference: "", detail: null }],
});

const previewStub = (): FiscalBoletaPrintPreview => ({
  caso: "caso-1",
  folio: 10,
  issuedAt: "2026-07-10",
  tipoDte: 39,
  isSimulated: true,
  timbrePdf417Payload: "TED",
  emisor: {
    rut: "1-9",
    legalName: "Demo",
    businessActivity: null,
    address: null,
    commune: null,
    city: null,
    resolutionNumber: null,
    resolutionDate: null,
  },
  emisorComplete: true,
  receptor: { rut: "66666666-6", name: "Cliente" },
  lines: [],
  totals: { mntNeto: 1000, mntExe: 0, iva: 190, mntTotal: 1190 },
  observation: null,
});

describe("sale-print-plan", () => {
  it("escenario A: solo no-DTE + Boleta → TICKET_ONLY", () => {
    const lines = [
      cartLine({ variantId: "v1", requiresDte: false }),
      cartLine({ variantId: "v2", requiresDte: false }),
    ];
    const buckets = classifySaleLines(lines);
    expect(resolvePrintPlan("BOLETA", buckets)).toBe("TICKET_ONLY");
  });

  it("escenario B: solo DTE + Boleta → BOLETA_ONLY", () => {
    const lines = [cartLine({ variantId: "v1" }), cartLine({ variantId: "v2" })];
    const buckets = classifySaleLines(lines);
    expect(resolvePrintPlan("BOLETA", buckets)).toBe("BOLETA_ONLY");
  });

  it("escenario C: mixto + Boleta → BOLETA_AND_TICKET", () => {
    const lines = [
      cartLine({ variantId: "v1", requiresDte: true }),
      cartLine({ variantId: "v2", requiresDte: false }),
    ];
    const buckets = classifySaleLines(lines);
    expect(resolvePrintPlan("BOLETA", buckets)).toBe("BOLETA_AND_TICKET");
  });

  it("selector Ticket explícito → TICKET_ONLY aunque haya DTE", () => {
    const lines = [
      cartLine({ variantId: "v1", requiresDte: true }),
      cartLine({ variantId: "v2", requiresDte: false }),
    ];
    expect(resolvePrintPlan("TICKET", classifySaleLines(lines))).toBe("TICKET_ONLY");
  });

  it("prorratea descuento de orden en mixto", () => {
    const dte = cartLine({ variantId: "v1", unitPriceWithTax: 2000, requiresDte: true });
    const nonDte = cartLine({ variantId: "v2", unitPriceWithTax: 1000, requiresDte: false });
    const alloc = allocateOrderDiscount([dte], [nonDte], 300);
    expect(alloc.dteOrderDiscount + alloc.nonDteOrderDiscount).toBe(300);
    expect(alloc.dteOrderDiscount).toBe(200);
    expect(alloc.nonDteOrderDiscount).toBe(100);
  });

  it("buildSalePrintJobs mixto encola boleta y ticket", () => {
    const receipt = { ...baseReceipt(), fiscalPrintPreview: previewStub() };
    const ticket = { ...baseReceipt(), folio: "SALE-1-T" };
    const jobs = buildSalePrintJobs({
      printPlan: "BOLETA_AND_TICKET",
      receipt,
      ticketReceipt: ticket,
    });
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.kind).toBe("fiscal-boleta");
    expect(jobs[1]?.kind).toBe("pos-sale-ticket");
  });

  it("buildSalePrintJobs BOLETA_ONLY sin preview fiscal degrada a ticket interno", () => {
    const receipt = baseReceipt();
    const jobs = buildSalePrintJobs({
      printPlan: "BOLETA_ONLY",
      receipt,
      ticketReceipt: null,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.kind).toBe("pos-sale-ticket");
    expect(jobs[0]?.kind === "pos-sale-ticket" && jobs[0].data.folio).toBe("SALE-1");
  });

  it("buildSalePrintJobs BOLETA_AND_TICKET sin preview imprime complemento no-DTE", () => {
    const receipt = baseReceipt();
    const ticket = { ...baseReceipt(), folio: "SALE-1-T", ticketRole: "non_dte_complement" as const };
    const jobs = buildSalePrintJobs({
      printPlan: "BOLETA_AND_TICKET",
      receipt,
      ticketReceipt: ticket,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.kind).toBe("pos-sale-ticket");
    expect(jobs[0]?.kind === "pos-sale-ticket" && jobs[0].data.folio).toBe("SALE-1-T");
  });

  it("ticket complemento no-DTE en mixto", () => {
    const lines = [
      cartLine({ variantId: "v1", productName: "DTE", requiresDte: true, unitPriceWithTax: 2000 }),
      cartLine({ variantId: "v2", productName: "No DTE", requiresDte: false, unitPriceWithTax: 1000 }),
    ];
    const ticket = buildTicketReceiptDataFromCart({
      base: {
        ...baseReceipt(),
        fiscalFolio: "198774",
        fiscalBoletaWarning: "Aviso fiscal",
      },
      cartLines: lines,
      totals: {
        net: 2500,
        gross: 3000,
        taxes: 500,
        discounts: 300,
        saleTotal: 2700,
        orderDiscount: 300,
        lineDiscountsTotal: 0,
      },
      printPlan: "BOLETA_AND_TICKET",
      ticketScope: "non_dte",
    });
    expect(ticket?.lines).toHaveLength(1);
    expect(ticket?.lines[0]?.productName).toBe("No DTE");
    expect(ticket?.totals.total).toBe(900);
    expect(ticket?.payments).toHaveLength(0);
    expect(ticket?.ticketRole).toBe("non_dte_complement");
    expect(ticket?.fiscalFolio).toBeNull();
    expect(ticket?.fiscalBoletaWarning).toBeNull();
    expect(ticket?.totals.taxes).toBe(0);
    expect(ticket?.totals.subtotalNet).toBe(0);
  });

  it("preserva tipAmount en ticket TICKET_ONLY (impresión del agente)", () => {
    const lines = [cartLine({ variantId: "v1", unitPriceWithTax: 10000 })];
    const ticket = buildTicketReceiptDataFromCart({
      base: {
        ...baseReceipt(),
        totals: {
          ...baseReceipt().totals,
          total: 10000,
          tipAmount: 1000,
        },
      },
      cartLines: lines,
      totals: {
        net: 8403,
        gross: 10000,
        taxes: 1597,
        discounts: 0,
        saleTotal: 10000,
        orderDiscount: 0,
        lineDiscountsTotal: 0,
      },
      printPlan: "TICKET_ONLY",
      ticketScope: "all",
    });
    expect(ticket?.totals.tipAmount).toBe(1000);
  });

  it("resolveEffectiveSaleDocumentKind: Boleta sin líneas DTE → TICKET", () => {
    const lines = [
      cartLine({ variantId: "v1", requiresDte: false }),
      cartLine({ variantId: "v2", requiresDte: false }),
    ];
    expect(resolveEffectiveSaleDocumentKind("BOLETA", lines)).toBe("TICKET");
    expect(resolveEffectiveSaleDocumentKind("TICKET", lines)).toBe("TICKET");
    expect(resolveEffectiveSaleDocumentKind("BOLETA", [cartLine({ variantId: "v1" })])).toBe(
      "BOLETA",
    );
  });

  it("boletaReducedToTicketMessage avisa al cajero", () => {
    const lines = [cartLine({ variantId: "v1", requiresDte: false })];
    expect(boletaReducedToTicketMessage("BOLETA", lines)).toMatch(/ticket interno/i);
    expect(boletaReducedToTicketMessage("TICKET", lines)).toBeNull();
    expect(boletaReducedToTicketMessage("BOLETA", [cartLine({ variantId: "v1" })])).toBeNull();
  });

  it("buildDteBoletaLinesFromCart prorratea descuento de orden en mixto", () => {
    const lines = [
      cartLine({ variantId: "v1", requiresDte: true, unitPriceWithTax: 2000 }),
      cartLine({ variantId: "v2", requiresDte: false, unitPriceWithTax: 1000 }),
    ];
    const built = buildDteBoletaLinesFromCart({
      cartLines: lines,
      orderDiscount: 300,
      mapLineName: (line) => line.productName ?? "Item",
    });
    expect(built.dteOrderDiscount).toBe(200);
    expect(built.totals.mntTotal).toBe(1800);
  });
});
