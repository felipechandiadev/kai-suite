"use client";

import { useMemo, useState } from "react";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import { PromotionActivation } from "../lib/promotion.enums";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PosPromotionsPanel() {
  const cart = usePosCart();
  const { isOffline } = usePosOffline();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const manualAvailable = useMemo(
    () =>
      cart.effectivePromotions.filter(
        (p) =>
          p.activation === PromotionActivation.MANUAL ||
          p.activation === PromotionActivation.AUTO,
      ),
    [cart.effectivePromotions],
  );

  const activeIds = useMemo(
    () => new Set(cart.appliedPromotions.map((p) => p.promotionId)),
    [cart.appliedPromotions],
  );

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (isOffline || !code.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemError(null);
    const res = await cart.redeemCode(code.trim());
    if (res.ok) {
      setCode("");
    } else {
      setRedeemError(res.message ?? "Cupón inválido");
    }
    setRedeeming(false);
  }

  if (isOffline) {
    return (
      <section
        className="rounded-xl border border-border bg-surface p-3 shadow-sm"
        data-test-id="pos-promotions-panel"
      >
        <p className="text-sm text-muted-foreground" data-test-id="pos-promotions-offline">
          Descuentos y cupones deshabilitados en modo offline.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-surface p-3 shadow-sm"
      data-test-id="pos-promotions-panel"
    >
      <header className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Promociones
        </h3>
        {cart.appliedPromotions.length > 0 ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {cart.appliedPromotions.length} aplicada
            {cart.appliedPromotions.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </header>

      {cart.appliedPromotions.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1">
          {cart.appliedPromotions.map((p) => (
            <li
              key={p.promotionId}
              className="flex items-center justify-between rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <span className="truncate">{p.promotionName}</span>
              <span className="font-semibold tabular-nums">
                -{formatMoney(p.amountDiscounted)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {manualAvailable.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">
            Disponibles para activar:
          </p>
          <ul className="flex flex-wrap gap-1">
            {manualAvailable.map((p) => {
              const active = activeIds.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => cart.togglePromotion(p.id)}
                    className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    }`}
                    data-test-id={`pos-promotion-manual-${p.id}`}
                  >
                    {active ? "✓ " : ""}
                    {p.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <form onSubmit={handleRedeem} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">
            Cupón
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CODE_ENTRY"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            data-test-id="pos-promotion-redeem-input"
          />
        </div>
        <button
          type="submit"
          disabled={redeeming || !code.trim()}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          data-test-id="pos-promotion-redeem-submit"
        >
          {redeeming ? "…" : "Canjear"}
        </button>
      </form>
      {redeemError ? (
        <p
          className="mt-2 text-xs text-red-600 dark:text-red-400"
          data-test-id="pos-promotion-redeem-error"
        >
          {redeemError}
        </p>
      ) : null}

      {cart.promotionWarnings.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1">
          {cart.promotionWarnings.map((w, i) => (
            <li
              key={`${w.promotionId}-${i}`}
              className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {w.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
