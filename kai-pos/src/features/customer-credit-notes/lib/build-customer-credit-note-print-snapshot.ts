import type {
  BuildCustomerCreditNotePrintInput,
  CustomerCreditNotePrintData,
  CustomerCreditNotePrintLine,
} from "../types/customer-credit-note-print.types";

function mapLines(cartLines: BuildCustomerCreditNotePrintInput["cartLines"]): CustomerCreditNotePrintLine[] {
  return cartLines.map((l) => {
    const attrs = (l.attributes ?? [])
      .map((a) => {
        const label = String(a.attributeName ?? "").trim();
        const val = String(a.attributeValue ?? "").trim();
        if (label && val) return `${label}: ${val}`;
        return val || label;
      })
      .filter(Boolean);
    const qty = Number(l.quantity) || 0;
    const unitGross = Number(l.unitPriceWithTax) || 0;
    return {
      productName: l.productName,
      attributes: attrs,
      quantity: qty,
      unitSymbol: l.unitSymbol ?? null,
      unitPriceWithTax: unitGross,
      lineGross: unitGross * qty,
      discountAmount: l.discount?.discountAmount ? Math.round(l.discount.discountAmount) : 0,
    };
  });
}

export function buildCustomerCreditNotePrintSnapshot(
  input: BuildCustomerCreditNotePrintInput,
): CustomerCreditNotePrintData {
  const c = input.company;
  const lines = mapLines(input.cartLines);
  const subtotalNet = lines.reduce(
    (acc, l) => acc + (Number(l.unitPriceWithTax) > 0 ? l.lineGross - l.discountAmount : 0),
    0,
  );
  const subtotalGross = lines.reduce((acc, l) => acc + l.lineGross - l.discountAmount, 0);

  return {
    creditNoteFolio: input.creditNote.documentNumber,
    saleReturnFolio: input.saleReturn.documentNumber,
    originalSaleFolio: input.originalSale.documentNumber,
    issuedAtIso: new Date().toISOString(),
    company: {
      razonSocial: c?.razonSocial?.trim() || "Empresa",
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoUrl: c?.logoUrl ?? null,
      address: c?.address?.trim() || null,
      mail: c?.mail?.trim() || null,
      phone: c?.phone?.trim() || null,
    },
    pos: {
      pointOfSaleName: input.posContext?.pointOfSaleName?.trim() || null,
      branchName: input.posContext?.branchName?.trim() || null,
    },
    customer: input.customer,
    lines,
    totals: {
      subtotalNet: input.saleReturn.subtotal || subtotalNet,
      taxes: input.saleReturn.taxAmount,
      discounts: input.saleReturn.discountAmount || input.lineDiscountsTotal,
      total: input.creditNote.total || input.saleReturn.total,
    },
    refundMode: input.refundMode ?? "document",
    refundPayments: input.refundPayments ?? [],
  };
}
