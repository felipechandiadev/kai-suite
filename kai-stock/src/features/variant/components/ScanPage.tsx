"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@kai/ui";
import { createProductPath } from "@/features/product/lib/product-routes";
import BarcodeScanner from "./BarcodeScanner";
import ScanModeSwitch from "./ScanModeSwitch";
import VariantNotFoundAlert from "./VariantNotFoundAlert";
import { useVariantLookup } from "../hooks/use-variant-lookup";
import type { ScanMode } from "../domain/scan-mode.entity";

export default function ScanPage() {
  const router = useRouter();
  const [skuMode, setSkuMode] = useState(false);
  const mode: ScanMode = skuMode ? "sku" : "barcode";

  const {
    error,
    pickerItems,
    notFoundCode,
    setNotFoundCode,
    pending,
    handleLookup,
    goToVariant,
    setPickerItems,
  } = useVariantLookup();

  return (
    <div className="flex flex-col gap-4 pb-8">
      <ScanModeSwitch skuMode={skuMode} onChange={setSkuMode} />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {notFoundCode ? (
        <VariantNotFoundAlert
          code={notFoundCode}
          pending={pending}
          onDismiss={() => setNotFoundCode(null)}
          onCreate={() => {
            router.push(createProductPath({ code: notFoundCode, mode }));
          }}
        />
      ) : null}

      <BarcodeScanner onScan={(code) => handleLookup(code, mode)} paused={pending} />

      {pickerItems && pickerItems.length > 1 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Varias coincidencias:</p>
          {pickerItems.map((item) => (
            <Button
              key={item.variantId}
              type="button"
              variant="secondary"
              onClick={() => {
                setPickerItems(null);
                goToVariant(item.variantId);
              }}
            >
              {item.productName} — {item.sku}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
