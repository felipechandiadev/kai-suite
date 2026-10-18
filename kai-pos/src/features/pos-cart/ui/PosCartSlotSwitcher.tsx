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
    clearCartSlot,
  } = usePosCart();

  const visibleTabs = cartSlotsSummary.filter((slot) => slot.isOpen);
  const onlyOneTab = visibleTabs.length <= 1;

  return (
    <div
      className={["flex min-w-0 flex-wrap items-center gap-1", className]
        .filter(Boolean)
        .join(" ")}
      data-test-id="pos-cart-slot-switcher"
    >
      <div
        className="flex min-w-0 flex-wrap items-end gap-x-0.5"
        role="tablist"
        aria-label="Carros de compra abiertos"
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
            <div
              key={slot.index}
              className={[
                "flex max-w-44 items-end border-b-2",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              ].join(" ")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                title={tip}
                onClick={() => switchCartSlot(slot.index as CartSlotIndex)}
                className="min-w-0 shrink px-2 py-1.5 text-left transition-colors"
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
              {!onlyOneTab || !slot.isEmpty ? (
                <IconButton
                  icon="X"
                  variant="text"
                  size="xs"
                  ariaLabel={`Eliminar ${label}`}
                  title={`Eliminar ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    clearCartSlot(slot.index as CartSlotIndex);
                  }}
                  className="mb-0.5 mr-0.5 shrink-0"
                  data-test-id={`pos-cart-slot-delete-${slot.index}`}
                />
              ) : null}
            </div>
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
            : "Máximo 4 carros (eliminá uno para liberar un slot)"
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
