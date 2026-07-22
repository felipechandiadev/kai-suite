/** Formatos 1D soportados (sin QR). */
export type BarcodeFormatId =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39";

export const DEFAULT_BARCODE_FORMATS: BarcodeFormatId[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "code_128",
  "code_39",
];

export type CreateBarcodeScannerOptions = {
  onScan: (code: string) => void;
  onError?: (message: string) => void;
  /** App hint for HTTPS/localhost messages (e.g. POS port). */
  appHint?: string;
  formats?: BarcodeFormatId[];
  /** Same-code debounce ms (default 1500). */
  debounceMs?: number;
  /** Target decode attempts per second (default 10). */
  fps?: number;
};

export type BarcodeScannerHandle = {
  start: (container: HTMLElement) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  setTorch: (on: boolean) => Promise<void>;
};
