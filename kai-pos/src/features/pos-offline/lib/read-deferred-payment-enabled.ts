import {
  POS_CONTEXT_CHANGED_EVENT,
  readPosContextClient,
} from "@/features/session/lib/pos-context-storage";
import { readSessionMeta } from "../application/session-meta.usecase";

/** Lee si el POS actual permite venta sin pago (contexto local → session_meta). */
export async function readDeferredPaymentEnabledFromOfflineCache(): Promise<boolean> {
  const ctxEnabled = readPosContextClient()?.deferredPaymentEnabled;
  if (ctxEnabled === true) return true;
  if (ctxEnabled === false) return false;

  const meta = await readSessionMeta();
  return meta?.deferredPaymentEnabled === true;
}

export function readDeferredPaymentEnabledFromContextSync(): boolean {
  return readPosContextClient()?.deferredPaymentEnabled === true;
}

export { POS_CONTEXT_CHANGED_EVENT };
