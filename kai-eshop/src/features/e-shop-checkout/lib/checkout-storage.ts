import type { CheckoutStepId } from "./checkout-steps";

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type CheckoutDraft = {
  version: number;
  cartId: string;
  cartToken: string;
  step: CheckoutStepId;
  savedAt: number;
  contact: {
    name: string;
    email: string;
    phone: string;
    wantsAccount: boolean;
    username: string;
    documentNumber: string;
  };
  delivery: {
    methodId: string;
    address: string;
    commune: string;
    region: string;
    notes: string;
    location?: import("../ui/CheckoutLocationStep").CheckoutLocationState;
    deliveryOccurrenceId?: string;
  };
  paymentMode: "online" | "coordinate";
};

function draftKey(cartId: string) {
  return `kaistore-checkout-draft:v${DRAFT_VERSION}:${cartId}`;
}

export function loadCheckoutDraft(cartId: string | null): CheckoutDraft | null {
  if (typeof window === "undefined" || !cartId) return null;
  try {
    const raw = localStorage.getItem(draftKey(cartId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(draftKey(cartId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(draftKey(draft.cartId), JSON.stringify(draft));
}

export function clearCheckoutDraft(cartId: string | null): void {
  if (typeof window === "undefined" || !cartId) return;
  localStorage.removeItem(draftKey(cartId));
}

export function resolveStepFromDraft(draft: CheckoutDraft): CheckoutStepId {
  return draft.step;
}
