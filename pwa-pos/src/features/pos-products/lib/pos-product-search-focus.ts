/** Evento para devolver el foco al buscador de productos del POS. */
export const POS_PRODUCT_SEARCH_FOCUS_EVENT = "flowstore:pos-product-search-focus";

const DEFAULT_DELAY_MS = 80;

/** Pide foco en el campo de búsqueda de productos (si el panel está visible y habilitado). */
export function requestPosProductSearchFocus(delayMs = DEFAULT_DELAY_MS): void {
  if (typeof window === "undefined") return;
  const dispatch = () => {
    window.dispatchEvent(new CustomEvent(POS_PRODUCT_SEARCH_FOCUS_EVENT));
  };
  if (delayMs <= 0) {
    dispatch();
    return;
  }
  window.setTimeout(dispatch, delayMs);
}
