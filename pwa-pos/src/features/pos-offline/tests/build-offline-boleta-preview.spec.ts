import { describe, expect, it, vi } from "vitest";

vi.mock("@kai/fiscal-ted", () => ({
  buildTedStamp: () => "<TED/>",
}));

import { buildOfflineBoletaPreview } from "../application/build-offline-boleta-preview.usecase";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { OfflineFiscalPack } from "../domain/offline-fiscal-pack.types";

const fiscalPack: OfflineFiscalPack = {
  pointOfSaleId: "pos-1",
  allocationId: "a1",
  cafId: "c1",
  dteType: 39,
  rangeFrom: 1,
  rangeTo: 100,
  nextFolioLocal: 2,
  cafXml: "<AUTORIZACION/>",
  emisor: {
    rut: "76123456-7",
    legalName: "Demo SPA",
    businessActivity: "Retail",
    address: "Calle 1",
    commune: "Santiago",
    city: "Santiago",
    resolutionNumber: "80",
    resolutionDate: "2020-01-01",
  },
  downloadedAt: new Date().toISOString(),
  packExpiresAt: new Date(Date.now() + 86400000).toISOString(),
};

function cartLine(partial: Partial<PosCartLine> & Pick<PosCartLine, "variantId">): PosCartLine {
  return {
    productId: "p1",
    productName: partial.productName ?? "Producto demo",
    productDescription: null,
    productImageUrl: null,
    sku: partial.sku ?? "SKU-1",
    barcode: null,
    unitSymbol: "UN",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 19,
    unitTaxAmount: 190,
    unitPriceWithTax: 1190,
    trackInventory: true,
    availableStock: 5,
    availableStockBase: 5,
    attributes: partial.attributes ?? [{ attributeId: "a1", attributeName: "Color", attributeValue: "Rojo" }],
    metadata: null,
    taxCategory: "TAX_STANDARD",
    requiresDte: partial.requiresDte ?? true,
    taxIds: [],
    quantity: partial.quantity ?? 1,
    ...partial,
  };
}

describe("build-offline-boleta-preview", () => {
  it("usa productName y atributos en líneas", () => {
    const { preview } = buildOfflineBoletaPreview({
      cartLines: [cartLine({ variantId: "v1", productName: "Polera básica" })],
      customer: null,
      fiscalPack,
      folio: 10,
      localDocumentNumber: "OFF-001",
    });
    expect(preview.lines[0]?.name).toContain("Polera básica");
    expect(preview.lines[0]?.name).toContain("Rojo");
  });

  it("mapea receptor desde PosSaleCustomer.document/name", () => {
    const { preview } = buildOfflineBoletaPreview({
      cartLines: [cartLine({ variantId: "v1" })],
      customer: {
        customerId: null,
        name: "Juan Pérez",
        document: "12.345.678-5",
        phone: "",
      },
      fiscalPack,
      folio: 11,
      localDocumentNumber: "OFF-002",
    });
    expect(preview.receptor.rut).toBe("12345678-5");
    expect(preview.receptor.name).toBe("Juan Pérez");
  });

  it("excluye líneas sin requiresDte del preview offline", () => {
    const { preview } = buildOfflineBoletaPreview({
      cartLines: [
        cartLine({ variantId: "v1", requiresDte: true, productName: "Con DTE" }),
        cartLine({ variantId: "v2", requiresDte: false, productName: "Sin DTE" }),
      ],
      customer: null,
      fiscalPack,
      folio: 12,
      localDocumentNumber: "OFF-003",
    });
    expect(preview.lines).toHaveLength(1);
    expect(preview.lines[0]?.name).toContain("Con DTE");
  });

  it("aplica descuento de orden prorrateado en carrito mixto", () => {
    const { preview } = buildOfflineBoletaPreview({
      cartLines: [
        cartLine({ variantId: "v1", requiresDte: true, unitPriceWithTax: 2000 }),
        cartLine({ variantId: "v2", requiresDte: false, unitPriceWithTax: 1000 }),
      ],
      customer: null,
      fiscalPack,
      folio: 13,
      localDocumentNumber: "OFF-004",
      orderDiscount: 300,
    });
    expect(preview.totals.mntTotal).toBe(1800);
  });
});
