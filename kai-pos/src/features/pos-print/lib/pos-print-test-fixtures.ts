import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import type { CashCountSheetPrintInput } from "@/features/cash-closing/lib/cash-count-sheet-print.types";
import type { CashSessionOpeningPrintInput } from "@/features/cash-session-opening/lib/cash-session-opening-print.types";
import { COUNTED_BUCKET_ROWS } from "@/features/cash-closing/lib/cash-closing-print-format";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import type { QuotationReceiptPrintInput } from "@/features/quotations/lib/quotation-receipt-print";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";

const TEST_ISSUED_AT = "2026-05-23T15:30:00.000Z";

export const POS_PRINT_TEST_COMPANY: CompanyDetails = {
  id: "test-company",
  razonSocial: "Comercial Demo SpA",
  nombreFantasia: "Tienda de Prueba",
  rut: "76.543.210-K",
  businessActivity: "Venta al por menor",
  address: "Av. Falsa 123, Santiago",
  mail: "demo@ejemplo.cl",
  phone: "+56 2 2345 6789",
  logoUrl: "/logo.png",
  bankAccounts: [],
};

const TEST_CUSTOMER = {
  customerId: null,
  name: "Cliente de Prueba",
  document: "12.345.678-9",
  phone: "+56 9 8765 4321",
  email: "cliente@ejemplo.cl",
};

function testPosBlock() {
  return {
    pointOfSaleName: "Caja 1 (prueba)",
    branchName: "Sucursal Centro",
    priceListLabel: "Lista general",
  };
}

export function buildPosPrintTestSaleReceipt(
  documentKind: "sale" | "backorder",
): PosSaleReceiptData {
  const isBackorder = documentKind === "backorder";
  const lines = [
    {
      productName: "Producto demo A",
      attributes: ["Talla M", "Azul"],
      quantity: 2,
      unitSymbol: "und",
      unitPriceWithTax: 5990,
      lineGross: 11980,
      discountAmount: 0,
      discountLabel: null,
    },
    {
      productName: "Producto demo B",
      attributes: [],
      quantity: 1,
      unitSymbol: "und",
      unitPriceWithTax: 12990,
      lineGross: 12990,
      discountAmount: 500,
      discountLabel: "Promo prueba",
    },
  ];
  const subtotalGross = 24470;
  const lineDiscounts = 500;
  const orderDiscount = 0;
  const total = isBackorder ? 50000 : 23970;
  return {
    folio: isBackorder ? "ENCPRUEBA001" : "VTAPRUEBA001",
    issuedAtIso: TEST_ISSUED_AT,
    documentKind,
    backorder: isBackorder
      ? { percent: 50, depositAmount: 12000, orderTotal: 50000 }
      : null,
    company: {
      razonSocial: POS_PRINT_TEST_COMPANY.razonSocial,
      nombreFantasia: POS_PRINT_TEST_COMPANY.nombreFantasia,
      rut: POS_PRINT_TEST_COMPANY.rut ?? null,
      businessActivity: POS_PRINT_TEST_COMPANY.businessActivity ?? null,
      logoUrl: POS_PRINT_TEST_COMPANY.logoUrl ?? null,
      address: POS_PRINT_TEST_COMPANY.address ?? null,
      mail: POS_PRINT_TEST_COMPANY.mail ?? null,
    },
    pos: testPosBlock(),
    customer: TEST_CUSTOMER,
    quotation: null,
    lines,
    promotions: isBackorder
      ? []
      : [{ code: "DEMO10", name: "Descuento demo", amount: 500 }],
    totals: {
      subtotalNet: Math.round(subtotalGross / 1.19),
      subtotalGross,
      taxes: Math.round((subtotalGross - lineDiscounts) * 0.19 / 1.19),
      lineDiscounts,
      orderDiscount,
      discountsTotal: lineDiscounts + orderDiscount,
      total,
      paid: isBackorder ? 12000 : total,
      change: isBackorder ? 0 : 30,
    },
    payments: isBackorder
      ? [{ label: "Abono encargo", amount: 12000, reference: "", detail: "Prueba" }]
      : [
          { label: "Efectivo", amount: 20000, reference: "", detail: null },
          { label: "Vuelto", amount: -30, reference: "", detail: null },
        ],
  };
}

export function buildPosPrintTestQuotationInput(): QuotationReceiptPrintInput {
  const quotation: QuotationDetail = {
    id: "cot-test-001",
    companyId: "test-company",
    documentNumber: "COT-PRUEBA-001",
    status: "ACTIVE",
    effectiveStatus: "ACTIVE",
    branchId: null,
    pointOfSaleId: null,
    customerId: null,
    customerName: TEST_CUSTOMER.name,
    customerDocument: TEST_CUSTOMER.document,
    total: 35700,
    subtotal: 30000,
    taxAmount: 5700,
    discountAmount: 0,
    currency: "CLP",
    issuedAt: TEST_ISSUED_AT,
    validUntil: "2026-06-23T15:30:00.000Z",
    validityDays: 30,
    terms: "Precios válidos 30 días. Documento de prueba.",
    priceListId: null,
    convertedToTransactionId: null,
    convertedToDocumentNumber: null,
    convertedAt: null,
    notes: "Cotización generada desde configuración de impresión (datos ficticios).",
    createdAt: TEST_ISSUED_AT,
    lines: [
      {
        id: "l1",
        lineNumber: 1,
        productId: null,
        productVariantId: null,
        productName: "Artículo cotizado demo",
        productSku: "SKU-DEMO-01",
        variantName: "Único",
        quantity: 3,
        unitPrice: 10000,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 19,
        taxAmount: 5700,
        subtotal: 30000,
        total: 35700,
        notes: null,
      },
    ],
  };
  return {
    quotation,
    company: POS_PRINT_TEST_COMPANY,
    branchName: "Sucursal Centro",
    pointOfSaleName: "Caja 1 (prueba)",
  };
}

export function buildPosPrintTestCreditNoteData(): CustomerCreditNotePrintData {
  return {
    creditNoteFolio: "NC-PRUEBA-001",
    saleReturnFolio: "DV-PRUEBA-001",
    originalSaleFolio: "VTAPRUEBA099",
    issuedAtIso: TEST_ISSUED_AT,
    company: {
      razonSocial: POS_PRINT_TEST_COMPANY.razonSocial,
      nombreFantasia: POS_PRINT_TEST_COMPANY.nombreFantasia,
      rut: POS_PRINT_TEST_COMPANY.rut ?? null,
      businessActivity: POS_PRINT_TEST_COMPANY.businessActivity ?? null,
      logoUrl: POS_PRINT_TEST_COMPANY.logoUrl ?? null,
      address: POS_PRINT_TEST_COMPANY.address ?? null,
      mail: POS_PRINT_TEST_COMPANY.mail ?? null,
    },
    pos: {
      pointOfSaleName: "Caja 1 (prueba)",
      branchName: "Sucursal Centro",
    },
    customer: TEST_CUSTOMER,
    lines: [
      {
        productName: "Producto devuelto demo",
        attributes: ["Talla L"],
        quantity: 1,
        unitSymbol: "und",
        unitPriceWithTax: 8990,
        lineGross: 8990,
        discountAmount: 0,
      },
    ],
    totals: {
      subtotalNet: 7555,
      taxes: 1435,
      discounts: 0,
      total: 8990,
    },
    refundMode: "immediate",
    refundPayments: [{ label: "Efectivo", amount: 8990 }],
  };
}

export function buildPosPrintTestCashCountSheetInput(): CashCountSheetPrintInput {
  return {
    cashSessionId: "session-prueba-001",
    sessionOpenedAt: "2026-05-23T09:00:00.000Z",
    company: POS_PRINT_TEST_COMPANY,
    branchName: "Sucursal Centro",
    pointOfSaleName: "Caja 1 (prueba)",
    operatorName: "Operador Demo",
    paymentLines: COUNTED_BUCKET_ROWS.map(({ label }) => ({ label })),
  };
}

export function buildPosPrintTestCashSessionOpeningInput(): CashSessionOpeningPrintInput {
  return {
    cashSessionId: "session-prueba-001",
    openedAt: TEST_ISSUED_AT,
    openingAmount: 150000,
    company: POS_PRINT_TEST_COMPANY,
    branchName: "Sucursal Centro",
    pointOfSaleName: "Caja 1 (prueba)",
    operatorName: "Operador Demo",
    cashHubName: "Centro efectivo principal",
  };
}

export function buildPosPrintTestCashClosingInput(): CashClosingPrintInput {
  return {
    closedAt: TEST_ISSUED_AT,
    sessionOpenedAt: "2026-05-23T09:00:00.000Z",
    cashSessionId: "session-prueba-001",
    message: "Arqueo de prueba — datos ficticios",
    usedBlindCount: false,
    countedGrand: 185000,
    systemCashExpected: 120000,
    difference: 5000,
    salesTotal: 450000,
    counted: {
      cash: 125000,
      debitCard: 35000,
      creditCard: 20000,
      transfer: 5000,
      check: 0,
      other: 0,
    },
    notes: "Generado desde configuración de impresión del POS.",
    pointOfSaleName: "Caja 1 (prueba)",
    branchName: "Sucursal Centro",
    operatorName: "Operador Demo",
    company: POS_PRINT_TEST_COMPANY,
  };
}
