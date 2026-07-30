"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { lookupVariantAction } from "../actions/variant.action";
import type { ScanMode } from "../domain/scan-mode.entity";
import type { VariantLookupItem } from "../types/variant.types";
import { variantDetailPath } from "../lib/variant-routes";

export function useVariantLookup() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pickerItems, setPickerItems] = useState<VariantLookupItem[] | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clearLookupState = useCallback(() => {
    setPickerItems(null);
    setNotFoundCode(null);
    setError("");
  }, []);

  const goToVariant = useCallback(
    (variantId: string) => {
      router.push(variantDetailPath(variantId));
    },
    [router],
  );

  const handleLookup = useCallback(
    (code: string, mode: ScanMode) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      clearLookupState();
      startTransition(async () => {
        const r = await lookupVariantAction({ code: trimmed, mode });
        if (!r.success) {
          if (handleUnauthorizedClient(r)) {
            return;
          }
          setError(r.error);
          return;
        }
        if (r.items.length === 0) {
          setNotFoundCode(trimmed);
          return;
        }
        if (r.items.length === 1) {
          goToVariant(r.items[0].variantId);
          return;
        }
        setPickerItems(r.items);
      });
    },
    [clearLookupState, goToVariant],
  );

  return {
    error,
    pickerItems,
    notFoundCode,
    setNotFoundCode,
    pending,
    handleLookup,
    goToVariant,
    clearLookupState,
    setPickerItems,
  };
}
