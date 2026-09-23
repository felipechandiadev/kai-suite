import { resumeOpenCashSession } from "@/sections/pos/lib/resolve-open-session";
import { usePosCartStore } from "@/sections/pos/store/pos-cart.store";
import { useSectionStore } from "./section-state.store";

/**
 * Click del carro → sección POS.
 * - Hay sesión abierta → pantalla de venta.
 * - No hay sesión → resolución (servidor) y, si sigue sin OPEN, apertura de caja.
 */
export function activatePosSection() {
  useSectionStore.getState().setActive("pos");

  const store = usePosCartStore.getState();

  if (store.sessionOpen && store.cashSessionId) {
    store.setPhase("sale");
    store.setSessionBootstrap("ready");
    return;
  }

  // Sin sesión local: comprobar servidor (puede haber OPEN) o ir a apertura.
  store.setSessionBootstrap("pending");
  void resumeOpenCashSession({ retries: 3 }).catch(() => {
    const s = usePosCartStore.getState();
    s.setSessionBootstrap("ready");
    s.setPhase("opening");
  });
}
