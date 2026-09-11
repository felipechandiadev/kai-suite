"use client";

import { IconButton } from "@kai/ui";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import type { CartSlotIndex } from "@/features/pos-cart/cart-storage";

type Props = {
  className?: string;
};

export function PosCartSlotSwitcher({ className }: Props) {
  const {
    activeCartSlot,
    cartSlotsSummary,
    switchCartSlot,
    canAddCartSlot,
    addCartSlot,
  } = usePosCart();

  const visibleTabs = cartSlotsSummary.filter(
    (slot) => slot.index === activeCartSlot || !slot.isEmpty,
  );

  return (
    <div
      className={["flex min-w-0 items-stretch gap-1", className].filter(Boolean).join(" ")}
      data-test-id="pos-cart-slot-switcher"
    >
      <div
        className="flex min-w-0 flex-wrap items-end"
        role="tablist"
        aria-label="Carros de compra"
      >
        {visibleTabs.map((slot) => {
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
                "max-w-36 shrink-0 border-b-2 px-2.5 py-1.5 text-left transition-colors",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              ].join(" ")}
              data-test-id={`pos-cart-slot-${slot.index}`}
            >
              <span className="block truncate text-xs font-semibold leading-tight">
                {label}
              </span>
              <span className="block truncate text-[10px] leading-tight opacity-80">
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
      <IconButton
        icon="Plus"
        variant="ghost"
        size="sm"
        ariaLabel="Añadir carro"
        title={
          canAddCartSlot
            ? "Añadir carro"
            : "Máximo 4 carros (vaciá uno para liberar un slot)"
        }
        disabled={!canAddCartSlot}
        onClick={() => {
          void addCartSlot();
        }}
        className="shrink-0 self-center"
        data-test-id="pos-cart-slot-add"
      />
    </div>
  );
}
