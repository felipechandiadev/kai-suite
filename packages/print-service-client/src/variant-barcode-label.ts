/**
 * Comprobante térmico mínimo con código de barras de variante → agente KaiPrinters
 * (`type: "variant-barcode-label"`).
 */

export const VARIANT_BARCODE_LABEL_PAYLOAD_VERSION = 1;

export type VariantBarcodeLabelPayload = {
  version: typeof VARIANT_BARCODE_LABEL_PAYLOAD_VERSION;
  productName: string;
  sku: string;
  barcode: string;
};

export type VariantBarcodeLabelPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
