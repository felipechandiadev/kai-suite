"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type Props = {
  value: string;
  className?: string;
};

/**
 * Vista previa del mismo CODE128 que se imprime en el ticket.
 */
export function ReceiptBarcodePreview({ value, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const v = value.trim();
    if (!v) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svg, v, {
        format: "CODE128",
        displayValue: true,
        fontSize: 11,
        height: 42,
        width: 1.35,
        margin: 2,
        textMargin: 2,
      });
      el.appendChild(svg);
    } catch {
      el.textContent = v;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      className={["flex justify-center [&_svg]:max-h-[52px] [&_svg]:max-w-full", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
