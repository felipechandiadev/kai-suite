/**
 * Comprobante térmico con código de barras de variante → agente KaiPrinters
 * (`type: "variant-barcode-label"`).
 */

export const VARIANT_BARCODE_LABEL_PAYLOAD_VERSION = 1;

export type VariantBarcodeLabelLayout = "minimal" | "detailed";

export type VariantBarcodeLabelAttribute = {
  label?: string;
  value: string;
};

export type VariantBarcodeLabelPayload = {
  version: typeof VARIANT_BARCODE_LABEL_PAYLOAD_VERSION;
  productName: string;
  sku: string;
  barcode: string;
  /** Default `minimal` si se omite (agentes viejos). */
  layout?: VariantBarcodeLabelLayout;
  attributes?: VariantBarcodeLabelAttribute[];
  /** Precio ya formateado, p.ej. `$1.990`. */
  priceLabel?: string;
};

export type VariantBarcodeLabelPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
