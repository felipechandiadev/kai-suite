import { formatPrintJobFailedMessage } from "@kai/print-service-client";
import { getFiscalBoletaPrintPreviewAction } from "../actions/reprint-fiscal-boleta.action";
import { printFiscalBoletaPreview } from "./fiscal-boleta-preview-print";

export async function reprintFiscalBoleta(transactionId: string): Promise<{
  success: boolean;
  message?: string;
  channel?: "agent" | "browser";
}> {
  const res = await getFiscalBoletaPrintPreviewAction(transactionId);
  if (!res.success) {
    return { success: false, message: res.message };
  }
  try {
    const channel = await printFiscalBoletaPreview(res.preview);
    return { success: true, channel };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      message: formatPrintJobFailedMessage(raw),
    };
  }
}
