/** Evento para devolver el foco al buscador de productos del POS. */
export const POS_PRODUCT_SEARCH_FOCUS_EVENT = "kai:pos-product-search-focus";
export const POS_PRODUCT_SEARCH_FOCUS_EVENT_LEGACY = "flowstore:pos-product-search-focus";

const DEFAULT_DELAY_MS = 80;

function dispatchPosProductSearchFocusEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POS_PRODUCT_SEARCH_FOCUS_EVENT));
  window.dispatchEvent(new CustomEvent(POS_PRODUCT_SEARCH_FOCUS_EVENT_LEGACY));
}

/** Escucha solicitudes de foco (kai: y flowstore: durante migración F6). */
export function addPosProductSearchFocusListener(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT, handler);
  window.addEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT_LEGACY, handler);
  return () => {
    window.removeEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT, handler);
    window.removeEventListener(POS_PRODUCT_SEARCH_FOCUS_EVENT_LEGACY, handler);
  };
}

/** Pide foco en el campo de búsqueda de productos (si el panel está visible y habilitado). */
export function requestPosProductSearchFocus(delayMs = DEFAULT_DELAY_MS): void {
  if (typeof window === "undefined") return;
  const dispatch = () => dispatchPosProductSearchFocusEvent();
  if (delayMs <= 0) {
    dispatch();
    return;
  }
  window.setTimeout(dispatch, delayMs);
}
