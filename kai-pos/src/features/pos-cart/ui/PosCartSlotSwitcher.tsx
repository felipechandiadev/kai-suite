"use client";

import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import type { CartSlotIndex } from "@/features/pos-cart/cart-storage";

type Props = {
  className?: string;
};

export function PosCartSlotSwitcher({ className }: Props) {
  const { activeCartSlot, cartSlotsSummary, switchCartSlot } = usePosCart();

  return (
    <div
      className={["flex items-stretch gap-1", className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label="Carros de compra"
      data-test-id="pos-cart-slot-switcher"
    >
      {cartSlotsSummary.map((slot) => {
        const selected = activeCartSlot === slot.index;
        const label = `Carro ${slot.index + 1}`;
        const tip = slot.customerName
          ? `${label}: ${slot.customerName}`
          : slot.itemsCount > 0
            ? `${label}: ${slot.itemsCount} ítems`
            : `${label}: vacío`;
        return (
          <button
            key={slot.index}
            type="button"
            role="tab"
            aria-selected={selected}
            title={tip}
            onClick={() => switchCartSlot(slot.index as CartSlotIndex)}
            className={[
              "min-w-0 flex-1 rounded-md border px-1.5 py-1 text-left transition-colors",
              selected
                ? "border-primary bg-muted/40"
                : "border-border hover:border-primary/40 hover:bg-muted/20",
            ].join(" ")}
            data-test-id={`pos-cart-slot-${slot.index}`}
          >
            <span className="block truncate text-[10px] font-semibold leading-tight text-foreground">
              {label}
            </span>
            <span className="block truncate text-[9px] leading-tight text-muted-foreground">
              {slot.customerName
                ? slot.customerName
                : slot.itemsCount > 0
                  ? `${slot.itemsCount} ítems`
                  : "Vacío"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
