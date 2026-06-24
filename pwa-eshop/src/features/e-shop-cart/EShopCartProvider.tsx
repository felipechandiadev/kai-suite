"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearCartStorage, loadCart, saveCart, type EShopCartLine } from "./cart-storage";
import type { EShopProductCard } from "@/features/e-shop-storefront/types/storefront.types";

type CartContextValue = {
  lines: EShopCartLine[];
  crossSell: EShopProductCard[];
  subtotal: number;
  itemCount: number;
  cartHydrated: boolean;
  drawerOpen: boolean;
  freeShippingThreshold: number | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (line: Omit<EShopCartLine, "quantity"> & { quantity?: number }) => void;
  removeItem: (productVariantId: string) => void;
  setQuantity: (productVariantId: string, quantity: number) => void;
  setFreeShippingThreshold: (n: number | null) => void;
  setCrossSell: (items: EShopProductCard[]) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function EShopCartProvider({
  children,
  initialFreeShippingThreshold = null,
}: {
  children: ReactNode;
  initialFreeShippingThreshold?: number | null;
}) {
  const [lines, setLines] = useState<EShopCartLine[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(
    initialFreeShippingThreshold,
  );
  const [crossSell, setCrossSell] = useState<EShopProductCard[]>([]);

  useEffect(() => {
    setLines(loadCart().lines);
    setCartHydrated(true);
  }, []);

  const persist = useCallback((next: EShopCartLine[]) => {
    setLines(next);
    saveCart({ lines: next });
  }, []);

  const addItem = useCallback(
    (item: Omit<EShopCartLine, "quantity"> & { quantity?: number }) => {
      const qty = Math.max(1, item.quantity ?? 1);
      setLines((prev) => {
        const existing = prev.find((l) => l.productVariantId === item.productVariantId);
        const next = existing
          ? prev.map((l) =>
              l.productVariantId === item.productVariantId
                ? { ...l, quantity: l.quantity + qty }
                : l,
            )
          : [...prev, { ...item, quantity: qty }];
        saveCart({ lines: next });
        return next;
      });
      setDrawerOpen(true);
    },
    [],
  );

  const removeItem = useCallback((productVariantId: string) => {
    setLines((prev) => {
      const next = prev.filter((l) => l.productVariantId !== productVariantId);
      saveCart({ lines: next });
      return next;
    });
  }, []);

  const setQuantity = useCallback((productVariantId: string, quantity: number) => {
    const q = Math.max(1, Math.floor(quantity));
    setLines((prev) => {
      const next = prev.map((l) =>
        l.productVariantId === productVariantId ? { ...l, quantity: q } : l,
      );
      saveCart({ lines: next });
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    clearCartStorage();
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      crossSell,
      subtotal,
      itemCount,
      cartHydrated,
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
    }),
    [
      lines,
      crossSell,
      subtotal,
      itemCount,
      cartHydrated,
      drawerOpen,
      freeShippingThreshold,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useEShopCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useEShopCart outside provider");
  return ctx;
}
