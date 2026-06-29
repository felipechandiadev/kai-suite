"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { readPosContextClient, POS_CONTEXT_KEY, POS_CONTEXT_KEY_LEGACY } from "@/features/session/lib/pos-context-storage";
import { readCartClient, writeCartClient, type LoadedQuotationMeta } from "./cart-storage";
import {
  mergePresaleTicketIntoCart,
  subtractPresaleTicketFromCart,
} from "@/features/presale-tickets/lib/merge-presale-ticket-into-cart";
import type { BackorderDepositConfig } from "./types/backorder-deposit.types";
import type {
  LoadedBackorderMeta,
  LoadedPresaleTicketMeta,
  LoadedReturnSaleMeta,
  PosCartMode,
} from "./types/pos-cart-mode.types";
import type { PosBackorderForFulfill } from "@/features/pos-backorders/types/pos-backorder-for-fulfill.types";
import type { PosSaleForReturn } from "@/features/pos-returns/types/pos-sale-for-return.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosPaymentLine } from "./pos-payment.types";
import { applyPromotions } from "@/features/promotions/lib/discount-engine";
import type {
  AppliedSnapshot,
  EffectivePromotion,
  EngineCartLine,
  EngineWarning,
  ManualSelection,
} from "@/features/promotions/lib/discount-engine.types";
import {
  listEffectivePromotionsAction,
  redeemPromotionCodeAction,
} from "@/features/promotions/actions/promotions-pos.action";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import { getQuotationsEnabledAction } from "@/features/company/actions/company-quotations.action";

type PosCartContextValue = {
  ready: boolean;
  lines: PosCartLine[];
  itemsCount: number;
  addItem: (item: PosProductSearchItem, quantity?: number) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  /** Reemplaza completamente las líneas (p.ej., cargar cotización). */
  replaceLines: (lines: PosCartLine[]) => void;
  /** Modalidad actual: venta normal o devolución de venta previa. */
  cartMode: PosCartMode;
  isReturnMode: boolean;
  isFulfillBackorderMode: boolean;
  loadedReturnSale: LoadedReturnSaleMeta | null;
  loadedBackorder: LoadedBackorderMeta | null;
  loadedPresaleTickets: LoadedPresaleTicketMeta[];
  /** Carga carrito en modo devolución desde una venta (folio interno). */
  loadReturnFromSale: (sale: PosSaleForReturn, lines: PosCartLine[]) => void;
  /** Carga reserva/encargo abierto para liquidar (venta + abono). */
  loadBackorderForFulfill: (backorder: PosBackorderForFulfill, lines: PosCartLine[]) => void;
  loadPresaleTicket: (
    meta: LoadedPresaleTicketMeta,
    listPriceItems: PosProductSearchItem[],
    customer?: PosSaleCustomer | null,
  ) => boolean;
  detachPresaleTicket: (ticketId: string) => void;
  /** Sale del modo devolución y vuelve a venta normal. */
  exitReturnMode: () => void;
  /** Sale del modo reserva y vuelve a venta normal. */
  exitFulfillBackorderMode: () => void;
  clear: () => void;
  /** Cliente de la venta (persistido con el carrito en localStorage). */
  saleCustomer: PosSaleCustomer | null;
  setSaleCustomer: React.Dispatch<React.SetStateAction<PosSaleCustomer | null>>;
  /** Líneas de pago (método, monto, ref.) compartidas entre `/pos` y `/pos/payment`. */
  payments: PosPaymentLine[];
  setPayments: React.Dispatch<React.SetStateAction<PosPaymentLine[]>>;
  /** Cotización origen del carrito (cuando se cargó vía folio). */
  loadedQuotation: LoadedQuotationMeta | null;
  setLoadedQuotation: React.Dispatch<
    React.SetStateAction<LoadedQuotationMeta | null>
  >;
  /** Carga cotización con tope de cantidad y precios del snapshot. */
  loadQuotation: (
    meta: LoadedQuotationMeta,
    lines: PosCartLine[],
    customer?: PosSaleCustomer | null,
  ) => void;
  /** Abono de encargo (backorder) definido en pantalla de cobro. */
  backorderDeposit: BackorderDepositConfig | null;
  setBackorderDeposit: React.Dispatch<
    React.SetStateAction<BackorderDepositConfig | null>
  >;
  clearBackorderDeposit: () => void;
  /** Modalidad encargo (resumen y cobro por abono). */
  encargoModeEnabled: boolean;
  setEncargoModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  /** Desactiva modalidad encargo y limpia abono. */
  disableEncargoMode: () => void;
  // ── Promociones ───────────────────────────────────────────────────
  /** Promociones efectivas cargadas desde el backend para este POS. */
  effectivePromotions: EffectivePromotion[];
  /** Promociones MANUAL/CODE_ENTRY que el cajero activó. */
  manualSelections: ManualSelection[];
  /** Resultado actual del motor — qué promos se están aplicando. */
  appliedPromotions: AppliedSnapshot[];
  /** Total de descuento a nivel de orden (post-líneas). */
  orderDiscount: number;
  /** Warnings emitidos por el motor (vence pronto, etc.). */
  promotionWarnings: EngineWarning[];
  /** Toggle manual de una promoción. */
  togglePromotion: (promotionId: string) => void;
  /** Canjea un cupón (CODE_ENTRY). Devuelve éxito o mensaje de error. */
  redeemCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  /** Refresca la lista de promociones efectivas desde el server. */
  refreshPromotions: () => Promise<void>;
  /** Módulo de cotizaciones habilitado en la empresa activa. */
  quotationsEnabled: boolean;
};

const PosCartContext = createContext<PosCartContextValue | null>(null);

export function usePosCart(): PosCartContextValue {
  const ctx = useContext(PosCartContext);
  if (!ctx) {
    throw new Error("usePosCart must be used within PosCartProvider");
  }
  return ctx;
}

function cartScope(): { pointOfSaleId: string; priceListId: string } | null {
  const pos = readPosContextClient();
  const posId = pos?.pointOfSaleId?.trim();
  const priceListId = pos?.priceListId?.trim();
  if (!posId || !priceListId) return null;
  return { pointOfSaleId: posId, priceListId };
}

function readPosContextFull(): {
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
} | null {
  const pos = readPosContextClient();
  const companyId = (pos as { companyId?: string } | null)?.companyId?.trim();
  const branchId = (pos as { branchId?: string } | null)?.branchId?.trim();
  const pointOfSaleId = pos?.pointOfSaleId?.trim();
  if (!companyId || !branchId || !pointOfSaleId) return null;
  return { companyId, branchId, pointOfSaleId };
}

function maxQtyForVariant(
  loadedBackorder: LoadedBackorderMeta | null,
  loadedReturnSale: LoadedReturnSaleMeta | null,
  loadedQuotation: LoadedQuotationMeta | null,
  variantId: string,
): number | null {
  if (loadedBackorder) {
    const n = loadedBackorder.lineMaxQtyByVariantId[variantId];
    return typeof n === "number" && n > 0 ? n : null;
  }
  if (loadedReturnSale) {
    const n = loadedReturnSale.lineMaxReturnableQtyByVariantId[variantId];
    return typeof n === "number" && n > 0 ? n : null;
  }
  if (loadedQuotation) {
    const n = loadedQuotation.lineMaxQtyByVariantId[variantId];
    return typeof n === "number" && n > 0 ? n : null;
  }
  return null;
}

export function isQuotationCartVariant(
  variantId: string,
  quotation: LoadedQuotationMeta | null,
): boolean {
  if (!quotation) return false;
  const n = quotation.lineMaxQtyByVariantId[variantId];
  return typeof n === "number" && n > 0;
}

/** True si el carrito aún tiene al menos una línea vinculada a la cotización cargada. */
export function cartHasLoadedQuotationLine(
  lines: PosCartLine[],
  quotation: LoadedQuotationMeta | null,
): boolean {
  if (!quotation) return false;
  return lines.some((l) => isQuotationCartVariant(l.variantId, quotation));
}

export default function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [saleCustomer, setSaleCustomer] = useState<PosSaleCustomer | null>(null);
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [loadedQuotation, setLoadedQuotation] =
    useState<LoadedQuotationMeta | null>(null);
  const [backorderDeposit, setBackorderDeposit] =
    useState<BackorderDepositConfig | null>(null);
  const [encargoModeEnabled, setEncargoModeEnabled] = useState(false);
  const [cartMode, setCartMode] = useState<PosCartMode>("sale");
  const [loadedReturnSale, setLoadedReturnSale] =
    useState<LoadedReturnSaleMeta | null>(null);
  const [loadedBackorder, setLoadedBackorder] =
    useState<LoadedBackorderMeta | null>(null);
  const [loadedPresaleTickets, setLoadedPresaleTickets] =
    useState<LoadedPresaleTicketMeta[]>([]);
  const [scope, setScope] = useState<{ pointOfSaleId: string; priceListId: string } | null>(null);
  const [quotationsEnabled, setQuotationsEnabled] = useState(false);

  // ── Promociones ─────────────────────────────────────────────────
  const [effectivePromotions, setEffectivePromotions] = useState<EffectivePromotion[]>(
    [],
  );
  const [manualSelections, setManualSelections] = useState<ManualSelection[]>([]);
  const [appliedPromotions, setAppliedPromotions] = useState<AppliedSnapshot[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [promotionWarnings, setPromotionWarnings] = useState<EngineWarning[]>([]);

  useEffect(() => {
    const s = cartScope();
    setScope(s);
    if (!s) {
      setLines([]);
      setSaleCustomer(null);
      setPayments([]);
      setLoadedQuotation(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setCartMode("sale");
      setLoadedReturnSale(null);
      setLoadedBackorder(null);
      setLoadedPresaleTickets([]);
      setReady(true);
      return;
    }
    const {
      lines: loadedLines,
      customer,
      quotation,
      backorderDeposit: loadedDeposit,
      encargoModeEnabled: loadedEncargoMode,
      cartMode: loadedMode,
      loadedReturnSale: loadedReturn,
      loadedBackorder: loadedBo,
      loadedPresaleTickets: loadedPresale,
    } = readCartClient(s);
    setLines(loadedLines);
    setSaleCustomer(customer);
    setPayments([]);
    setLoadedQuotation(quotation);
    setBackorderDeposit(loadedDeposit);
    setEncargoModeEnabled(loadedEncargoMode);
    setCartMode(loadedMode);
    setLoadedReturnSale(loadedReturn);
    setLoadedBackorder(loadedBo);
    setLoadedPresaleTickets(loadedPresale);
    setReady(true);
  }, []);

  useEffect(() => {
    void getQuotationsEnabledAction().then(setQuotationsEnabled);
  }, []);

  useEffect(() => {
    if (!ready || quotationsEnabled) return;
    if (!loadedQuotation) return;
    setLoadedQuotation(null);
  }, [ready, quotationsEnabled, loadedQuotation]);

  useEffect(() => {
    if (!ready || !scope) return;
    writeCartClient(
      scope,
      lines,
      saleCustomer,
      loadedQuotation,
      backorderDeposit,
      cartMode,
      loadedReturnSale,
      encargoModeEnabled,
      loadedBackorder,
      loadedPresaleTickets,
    );
  }, [
    lines,
    saleCustomer,
    loadedQuotation,
    backorderDeposit,
    encargoModeEnabled,
    cartMode,
    loadedReturnSale,
    loadedBackorder,
    loadedPresaleTickets,
    ready,
    scope,
  ]);

  // If POS context changes (e.g. price list changed in settings), reload cart scope.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== POS_CONTEXT_KEY && e.key !== POS_CONTEXT_KEY_LEGACY) return;
      const s = cartScope();
      setScope(s);
      if (!s) {
        setLines([]);
        setSaleCustomer(null);
        setPayments([]);
        setLoadedQuotation(null);
        setBackorderDeposit(null);
        setEncargoModeEnabled(false);
        setCartMode("sale");
        setLoadedReturnSale(null);
        setLoadedBackorder(null);
        return;
      }
      const {
        lines: nextLines,
        customer,
        quotation,
        backorderDeposit: nextDeposit,
        encargoModeEnabled: nextEncargoMode,
        cartMode: nextMode,
        loadedReturnSale: nextReturn,
        loadedBackorder: nextBo,
        loadedPresaleTickets: nextPresale,
      } = readCartClient(s);
      setLines(nextLines);
      setSaleCustomer(customer);
      setPayments([]);
      setLoadedQuotation(quotation);
      setBackorderDeposit(nextDeposit);
      setEncargoModeEnabled(nextEncargoMode);
      setCartMode(nextMode);
      setLoadedReturnSale(nextReturn);
      setLoadedBackorder(nextBo);
      setLoadedPresaleTickets(nextPresale);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const itemsCount = useMemo(() => lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0), [lines]);

  const addItem = useCallback(
    (item: PosProductSearchItem, quantity = 1) => {
      if (cartMode === "return" || cartMode === "fulfill_backorder") return;
      const q = Math.max(1, Math.round(Number(quantity) || 1));
      setLines((prev) => {
        const i = prev.findIndex((l) => l.variantId === item.variantId);
        if (i >= 0) {
          const max = maxQtyForVariant(
            loadedBackorder,
            loadedReturnSale,
            loadedQuotation,
            item.variantId,
          );
          const nextQty = prev[i].quantity + q;
          const capped = max != null ? Math.min(nextQty, max) : nextQty;
          const next = [...prev];
          next[i] = { ...next[i], quantity: capped };
          return next;
        }
        return [...prev, { ...(item as any), quantity: q } as PosCartLine];
      });
    },
    [cartMode, loadedBackorder, loadedReturnSale, loadedQuotation],
  );

  const increment = useCallback(
    (variantId: string) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.variantId !== variantId) return l;
          const max = maxQtyForVariant(
            loadedBackorder,
            loadedReturnSale,
            loadedQuotation,
            variantId,
          );
          const nextQty = l.quantity + 1;
          if (max != null && nextQty > max) return l;
          return { ...l, quantity: nextQty };
        }),
      );
    },
    [loadedBackorder, loadedReturnSale, loadedQuotation],
  );

  const decrement = useCallback((variantId: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    if (cartMode === "fulfill_backorder") return;
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, [cartMode]);

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q <= 0) return;
      const max = maxQtyForVariant(
        loadedBackorder,
        loadedReturnSale,
        loadedQuotation,
        variantId,
      );
      const capped = max != null ? Math.min(q, max) : q;
      setLines((prev) =>
        prev.map((l) => (l.variantId === variantId ? { ...l, quantity: capped } : l)),
      );
    },
    [loadedBackorder, loadedReturnSale, loadedQuotation],
  );

  const loadQuotation = useCallback(
    (
      meta: LoadedQuotationMeta,
      nextLines: PosCartLine[],
      customer?: PosSaleCustomer | null,
    ) => {
      if (!quotationsEnabled) return;
      setCartMode("sale");
      setLoadedReturnSale(null);
      setLoadedBackorder(null);
      setLoadedPresaleTickets([]);
      setLoadedQuotation(meta);
      setLines(nextLines);
      setPayments([]);
      setManualSelections([]);
      if (customer !== undefined) {
        setSaleCustomer(customer);
      }
    },
    [quotationsEnabled],
  );

  const replaceLines = useCallback((next: PosCartLine[]) => {
    setCartMode("sale");
    setLoadedReturnSale(null);
    setLoadedBackorder(null);
    setLoadedQuotation(null);
    setLines(next);
  }, []);

  const loadReturnFromSale = useCallback(
    (sale: PosSaleForReturn, nextLines: PosCartLine[]) => {
      setCartMode("return");
      const lineMaxReturnableQtyByVariantId: Record<string, number> = {
        ...(sale.lineMaxReturnableQtyByVariantId ?? {}),
      };
      for (const l of nextLines) {
        if (!lineMaxReturnableQtyByVariantId[l.variantId]) {
          lineMaxReturnableQtyByVariantId[l.variantId] = l.quantity;
        }
      }
      setLoadedReturnSale({
        id: sale.id,
        documentNumber: sale.documentNumber,
        total: Number(sale.total) || 0,
        createdAt: sale.createdAt,
        lineMaxReturnableQtyByVariantId,
        sourceHasCustomer: Boolean(sale.customerId?.trim()),
      });
      setLoadedQuotation(null);
      setLoadedBackorder(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setPayments([]);
      setManualSelections([]);
      setLines(nextLines);
      if (sale.customerName) {
        setSaleCustomer({
          customerId: sale.customerId,
          name: sale.customerName,
          document: sale.customerDocument ?? "",
          phone: "",
        });
      } else {
        setSaleCustomer(null);
      }
    },
    [],
  );

  const loadBackorderForFulfill = useCallback(
    (backorder: PosBackorderForFulfill, nextLines: PosCartLine[]) => {
      const lineMaxQtyByVariantId: Record<string, number> = {};
      for (const l of nextLines) {
        lineMaxQtyByVariantId[l.variantId] = l.quantity;
      }
      setCartMode("fulfill_backorder");
      setLoadedReturnSale(null);
      setLoadedQuotation(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setPayments([]);
      setManualSelections([]);
      setLoadedBackorder({
        id: backorder.id,
        documentNumber: backorder.documentNumber,
        orderTotal: Number(backorder.total) || 0,
        depositAvailable: Number(backorder.depositAvailable) || 0,
        createdAt: backorder.createdAt,
        lineMaxQtyByVariantId,
      });
      setLines(nextLines);
      if (backorder.customerId) {
        setSaleCustomer({
          customerId: backorder.customerId,
          name: backorder.customerName?.trim() || "Cliente",
          document: backorder.customerDocument?.trim() ?? "",
          phone: "",
          email: null,
        });
      } else {
        setSaleCustomer(null);
      }
    },
    [],
  );

  const loadPresaleTicket = useCallback(
    (
      meta: LoadedPresaleTicketMeta,
      listPriceItems: PosProductSearchItem[],
      customer?: PosSaleCustomer | null,
    ): boolean => {
      let isDuplicate = false;
      setLoadedPresaleTickets((prev) => {
        if (prev.some((t) => t.id === meta.id)) {
          isDuplicate = true;
          return prev;
        }
        return [...prev, meta];
      });
      if (isDuplicate) return false;

      setCartMode("sale");
      setLoadedReturnSale(null);
      setLoadedBackorder(null);
      setLoadedQuotation(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setPayments([]);
      setManualSelections([]);
      setLines((prev) => mergePresaleTicketIntoCart(prev, meta, listPriceItems));
      if (customer !== undefined) {
        setSaleCustomer((prev) => prev ?? customer ?? null);
      }
      return true;
    },
    [],
  );

  const detachPresaleTicket = useCallback(
    (ticketId: string) => {
      const ticket = loadedPresaleTickets.find((t) => t.id === ticketId);
      if (!ticket) return;
      setLoadedPresaleTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setLines((prev) => subtractPresaleTicketFromCart(prev, ticket));
    },
    [loadedPresaleTickets],
  );

  const exitReturnMode = useCallback(() => {
    setCartMode("sale");
    setLoadedReturnSale(null);
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setManualSelections([]);
    setAppliedPromotions([]);
    setOrderDiscount(0);
    setPromotionWarnings([]);
  }, []);

  /** Carrito vacío en devolución = desvincular venta y volver a venta normal. */
  useEffect(() => {
    if (!ready) return;
    if (cartMode !== "return" || !loadedReturnSale) return;
    if (lines.length > 0) return;
    exitReturnMode();
  }, [ready, cartMode, loadedReturnSale, lines.length, exitReturnMode]);

  /** Sin líneas de la cotización en el carrito = desvincular cotización (pueden quedar otros productos). */
  useEffect(() => {
    if (!ready) return;
    if (!loadedQuotation) return;
    if (cartHasLoadedQuotationLine(lines, loadedQuotation)) return;
    setLoadedQuotation(null);
  }, [ready, loadedQuotation, lines]);

  const exitFulfillBackorderMode = useCallback(() => {
    setCartMode("sale");
    setLoadedBackorder(null);
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setManualSelections([]);
    setAppliedPromotions([]);
    setOrderDiscount(0);
    setPromotionWarnings([]);
  }, []);

  const clearBackorderDeposit = useCallback(() => {
    setBackorderDeposit(null);
  }, []);

  const disableEncargoMode = useCallback(() => {
    setEncargoModeEnabled(false);
    setBackorderDeposit(null);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setLoadedQuotation(null);
    setBackorderDeposit(null);
    setEncargoModeEnabled(false);
    setCartMode("sale");
    setLoadedReturnSale(null);
    setLoadedBackorder(null);
    setLoadedPresaleTickets([]);
    setManualSelections([]);
    setAppliedPromotions([]);
    setOrderDiscount(0);
    setPromotionWarnings([]);
  }, []);

  // ── Carga inicial de promociones efectivas ─────────────────────
  const refreshPromotions = useCallback(async () => {
    const ctx = readPosContextFull();
    if (!ctx) {
      setEffectivePromotions([]);
      return;
    }
    const res = await listEffectivePromotionsAction({
      branchId: ctx.branchId,
      pointOfSaleId: ctx.pointOfSaleId,
    });
    if (!res.success) {
      redirectToLoginIfUnauthorized(res);
      return;
    }
    setEffectivePromotions(res.promotions);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshPromotions();
  }, [ready, refreshPromotions]);

  // ── Re-cálculo reactivo del motor de descuentos ────────────────
  // Identidad de "lineas relevantes" para minimizar recomputes.
  const linesSignature = useMemo(
    () =>
      JSON.stringify(
        lines.map((l) => [l.variantId, l.quantity, l.unitPriceWithTax]),
      ),
    [lines],
  );
  const paymentsSignature = useMemo(
    () =>
      JSON.stringify(
        payments.map((p) => [p.companyPaymentMethodId ?? "", Number(p.amount) || 0]),
      ),
    [payments],
  );

  useEffect(() => {
    if (!ready) return;
    const ctx = readPosContextFull();
    if (!ctx) {
      setAppliedPromotions([]);
      setOrderDiscount(0);
      setPromotionWarnings([]);
      return;
    }
    const engineLines: EngineCartLine[] = lines.map((l) => ({
      lineId: l.variantId,
      variantId: l.variantId,
      productId: l.productId,
      categoryId: null,
      unitPrice: Number(l.unitPriceWithTax) || 0,
      quantity: Number(l.quantity) || 0,
      frozenDiscount:
        loadedQuotation || cartMode === "return" || cartMode === "fulfill_backorder"
          ? (l.discount ?? null)
          : null,
    }));

    const result = applyPromotions({
      cart: {
        lines: engineLines,
        customerId: saleCustomer?.customerId ?? null,
        paymentMethodIds: payments
          .filter((p) => (Number(p.amount) || 0) > 0)
          .map((p) => p.companyPaymentMethodId)
          .filter((x): x is string => !!x),
      },
      ctx: { ...ctx, now: new Date() },
      promotions: effectivePromotions,
      manualSelections,
      customerHistory: [],
    });

    setLines((prev) =>
      prev.map((l) => {
        const r = result.resolvedLines.find((x) => x.lineId === l.variantId);
        const nextDiscount = r?.discount ?? null;
        if ((l.discount ?? null) === nextDiscount) return l;
        return { ...l, discount: nextDiscount };
      }),
    );
    setOrderDiscount(result.orderDiscountAmount);
    setAppliedPromotions(result.appliedPromotions);
    setPromotionWarnings(result.warnings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    linesSignature,
    saleCustomer?.customerId,
    paymentsSignature,
    effectivePromotions,
    manualSelections,
    loadedQuotation,
    cartMode,
  ]);

  const togglePromotion = useCallback((promotionId: string) => {
    setManualSelections((prev) => {
      const exists = prev.some((m) => m.promotionId === promotionId);
      return exists
        ? prev.filter((m) => m.promotionId !== promotionId)
        : [...prev, { promotionId }];
    });
  }, []);

  const redeemCode = useCallback(
    async (code: string): Promise<{ ok: boolean; message?: string }> => {
      const ctx = readPosContextFull();
      if (!ctx) return { ok: false, message: "Sin contexto POS" };
      const res = await redeemPromotionCodeAction({
        code: code.trim(),
        branchId: ctx.branchId,
        pointOfSaleId: ctx.pointOfSaleId,
      });
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return { ok: false };
        return { ok: false, message: res.message };
      }
      // Agrega al listado efectivo si no estaba.
      setEffectivePromotions((prev) =>
        prev.some((p) => p.id === res.promotion.id) ? prev : [...prev, res.promotion],
      );
      // Y la activa manualmente.
      setManualSelections((prev) =>
        prev.some((m) => m.promotionId === res.promotion.id)
          ? prev
          : [...prev, { promotionId: res.promotion.id }],
      );
      return { ok: true };
    },
    [],
  );

  const value: PosCartContextValue = useMemo(
    () => ({
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      remove,
      setQuantity,
      replaceLines,
      cartMode,
      isReturnMode: cartMode === "return",
      isFulfillBackorderMode: cartMode === "fulfill_backorder",
      loadedReturnSale,
      loadedBackorder,
      loadedPresaleTickets,
      loadReturnFromSale,
      loadBackorderForFulfill,
      loadPresaleTicket,
      loadQuotation,
      exitReturnMode,
      exitFulfillBackorderMode,
      detachPresaleTicket,
      clear,
      saleCustomer,
      setSaleCustomer,
      payments,
      setPayments,
      loadedQuotation,
      setLoadedQuotation,
      backorderDeposit,
      setBackorderDeposit,
      clearBackorderDeposit,
      encargoModeEnabled,
      setEncargoModeEnabled,
      disableEncargoMode,
      effectivePromotions,
      manualSelections,
      appliedPromotions,
      orderDiscount,
      promotionWarnings,
      togglePromotion,
      redeemCode,
      refreshPromotions,
      quotationsEnabled,
    }),
    [
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      remove,
      setQuantity,
      replaceLines,
      cartMode,
      loadedReturnSale,
      loadedBackorder,
      loadedPresaleTickets,
      loadReturnFromSale,
      loadBackorderForFulfill,
      loadPresaleTicket,
      loadQuotation,
      exitReturnMode,
      exitFulfillBackorderMode,
      detachPresaleTicket,
      clear,
      saleCustomer,
      payments,
      loadedQuotation,
      backorderDeposit,
      clearBackorderDeposit,
      encargoModeEnabled,
      disableEncargoMode,
      effectivePromotions,
      manualSelections,
      appliedPromotions,
      orderDiscount,
      promotionWarnings,
      togglePromotion,
      redeemCode,
      refreshPromotions,
      quotationsEnabled,
    ],
  );

  return <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>;
}

export type { PosPaymentLine, PosPaymentMethodId } from "./pos-payment.types";

