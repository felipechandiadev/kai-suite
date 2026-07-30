import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";

export type FiscalBoletaBrowserPrintJob = {
  preview: FiscalBoletaPrintPreview;
  /** Si falta o está vacío, el host lo genera antes de imprimir. */
  pdf417Svg?: string;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type EnqueueFn = (job: FiscalBoletaBrowserPrintJob) => void;

let enqueueFn: EnqueueFn | null = null;

export function registerFiscalBoletaBrowserPrintHost(fn: EnqueueFn | null): void {
  enqueueFn = fn;
}

export function isFiscalBoletaBrowserPrintHostReady(): boolean {
  return enqueueFn != null;
}

export function printFiscalBoletaViaReactToPrint(
  preview: FiscalBoletaPrintPreview,
  pdf417Svg?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!enqueueFn) {
      reject(new Error("fiscal_boleta_print_host_unavailable"));
      return;
    }
    enqueueFn({ preview, pdf417Svg, resolve, reject });
  });
}
