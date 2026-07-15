"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  addCartItemAction,
  clearCartAction,
  fetchCartAction,
  lockCartForCheckoutAction,
  mergeGuestCartAction,
  revalidateCartAction,
  removeCartItemAction,
  startFreshCartAfterOrderAction,
  unlockCartAction,
  updateCartQtyAction,
} from "./actions/cart.action";
import { useEShopCartWebSocket } from "./hooks/useEShopCartWebSocket";
import { loadCart, clearCartStorage } from "./cart-storage";
import { mapDtoToLines } from "./lib/map-cart-ui";
import type {
  CartAccessMode,
  CartIssue,
  EShopCartDto,
  EShopCartLine,
} from "./types/cart.types";
import type { EShopProductCard as StorefrontProductCard } from "@/features/e-shop-storefront/types/storefront.types";

type CartContextValue = {
  lines: EShopCartLine[];
  crossSell: StorefrontProductCard[];
  subtotal: number;
  itemCount: number;
  cartHydrated: boolean;
  cartLoading: boolean;
  cartUpdating: boolean;
  cartLocked: boolean;
  cartAccessMode: CartAccessMode;
  issues: CartIssue[];
  cartId: string | null;
  cartToken: string | null;
  companyId: string | null;
  drawerOpen: boolean;
  freeShippingThreshold: number | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (line: Omit<EShopCartLine, "quantity"> & { quantity?: number }) => Promise<void>;
  removeItem: (productVariantId: string) => Promise<void>;
  setQuantity: (productVariantId: string, quantity: number) => Promise<void>;
  setFreeShippingThreshold: (n: number | null) => void;
  setCrossSell: (items: StorefrontProductCard[]) => void;
  clearCart: () => Promise<void>;
  /** Descarta cookie del carrito convertido y abre uno vacío (post-pedido). */
  startFreshCartAfterOrder: () => Promise<void>;
  revalidateCart: () => Promise<void>;
  lockForCheckout: () => Promise<void>;
  unlockCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function applyServerCart(
  cart: EShopCartDto,
  setters: {
    setServerCart: (c: EShopCartDto) => void;
    setLines: (l: EShopCartLine[]) => void;
    setIssues: (i: CartIssue[]) => void;
  },
) {
  setters.setServerCart(cart);
  setters.setLines(mapDtoToLines(cart));
  setters.setIssues(cart.issues ?? []);
}

export function EShopCartProvider({
  children,
  initialFreeShippingThreshold = null,
}: {
  children: ReactNode;
  initialFreeShippingThreshold?: number | null;
}) {
  const pathname = usePathname();
  const [serverCart, setServerCart] = useState<EShopCartDto | null>(null);
  const [lines, setLines] = useState<EShopCartLine[]>([]);
  const [issues, setIssues] = useState<CartIssue[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartUpdating, setCartUpdating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(
    initialFreeShippingThreshold,
  );
  const [crossSell, setCrossSell] = useState<StorefrontProductCard[]>([]);
  const migratedRef = useRef(false);

  const cartAccessMode: CartAccessMode =
    serverCart?.status === "checkout_locked" ? "checkout_locked" : "browsing";
  const cartLocked = cartAccessMode === "checkout_locked";

  const apply = useCallback((cart: EShopCartDto) => {
    applyServerCart(cart, { setServerCart, setLines, setIssues });
  }, []);

  const bootstrap = useCallback(async () => {
    setCartLoading(true);
    try {
      let cart = await fetchCartAction();

      if (!migratedRef.current) {
        migratedRef.current = true;
        const legacy = loadCart().lines;
        if (legacy.length > 0 && cart.items.length === 0) {
          for (const line of legacy) {
            cart = await addCartItemAction({
              productVariantId: line.productVariantId,
              quantity: line.quantity,
              imageUrl: line.imageUrl,
            });
          }
          clearCartStorage();
        }
      }

      try {
        await mergeGuestCartAction().then((merged) => {
          if (merged) cart = merged;
        });
      } catch {
        // guest merge optional
      }

      cart = await revalidateCartAction();
      apply(cart);
    } catch {
      const legacy = loadCart();
      setLines(legacy.lines);
    } finally {
      setCartHydrated(true);
      setCartLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (pathname?.startsWith("/checkout")) return;
    if (!cartLocked) return;
    void unlockCartAction()
      .then(apply)
      .catch(() => undefined);
  }, [pathname, cartLocked, apply]);

  useEShopCartWebSocket({
    cartId: serverCart?.id ?? null,
    cartToken: serverCart?.cartToken ?? null,
    companyId: serverCart?.companyId ?? null,
    enabled: cartHydrated && !cartLoading,
    onUpdate: (payload) => apply(payload.cart),
  });

  const runMutation = useCallback(
    async (fn: () => Promise<EShopCartDto>, openDrawerOnAdd = false) => {
      if (cartLocked) return;
      setCartUpdating(true);
      try {
        const cart = await fn();
        apply(cart);
        if (openDrawerOnAdd) setDrawerOpen(true);
      } finally {
        setCartUpdating(false);
      }
    },
    [apply, cartLocked],
  );

  const addItem = useCallback(
    async (item: Omit<EShopCartLine, "quantity"> & { quantity?: number }) => {
      await runMutation(
        () =>
          addCartItemAction({
            productVariantId: item.productVariantId,
            quantity: item.quantity ?? 1,
            imageUrl: item.imageUrl,
          }),
        true,
      );
    },
    [runMutation],
  );

  const removeItem = useCallback(
    async (productVariantId: string) => {
      await runMutation(() => removeCartItemAction(productVariantId));
    },
    [runMutation],
  );

  const setQuantity = useCallback(
    async (productVariantId: string, quantity: number) => {
      await runMutation(() => updateCartQtyAction(productVariantId, quantity));
    },
    [runMutation],
  );

  const clearCart = useCallback(async () => {
    try {
      await runMutation(() => clearCartAction());
    } catch {
      const cart = await startFreshCartAfterOrderAction();
      apply(cart);
    }
    clearCartStorage();
  }, [runMutation, apply]);

  const startFreshCartAfterOrder = useCallback(async () => {
    setCartUpdating(true);
    try {
      const cart = await startFreshCartAfterOrderAction();
      apply(cart);
      clearCartStorage();
    } finally {
      setCartUpdating(false);
    }
  }, [apply]);

  const revalidateCart = useCallback(async () => {
    await runMutation(() => revalidateCartAction());
  }, [runMutation]);

  const lockForCheckout = useCallback(async () => {
    setCartUpdating(true);
    try {
      const cart = await lockCartForCheckoutAction();
      apply(cart);
    } finally {
      setCartUpdating(false);
    }
  }, [apply]);

  const unlockCart = useCallback(async () => {
    const cart = await unlockCartAction();
    apply(cart);
  }, [apply]);

  const subtotal = serverCart?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const itemCount =
    serverCart?.itemCount ?? lines.reduce((s, l) => s + l.quantity, 0);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      crossSell,
      subtotal,
      itemCount,
      cartHydrated,
      cartLoading,
      cartUpdating,
      cartLocked,
      cartAccessMode,
      issues,
      cartId: serverCart?.id ?? null,
      cartToken: serverCart?.cartToken ?? null,
      companyId: serverCart?.companyId ?? null,
      drawerOpen,
      freeShippingThreshold,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      removeItem,
      setQuantity,
      setFreeShippingThreshold,
      setCrossSell,
      clearCart,
      startFreshCartAfterOrder,
      revalidateCart,
      lockForCheckout,
      unlockCart,
    }),
    [
      lines,
      crossSell,
      subtotal,
      itemCount,
      cartHydrated,
      cartLoading,
      cartUpdating,
      cartLocked,
      cartAccessMode,
      issues,
      serverCart,
      drawerOpen,
      freeShippingThreshold,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      startFreshCartAfterOrder,
      revalidateCart,
      lockForCheckout,
      unlockCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useEShopCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useEShopCart outside provider");
  return ctx;
}
