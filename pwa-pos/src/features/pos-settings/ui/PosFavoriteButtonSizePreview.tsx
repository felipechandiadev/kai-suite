"use client";

import type { PosFavoriteButtonSize } from "../lib/pos-favorite-quickpick-storage";
import { getFavoriteButtonSizeStyles } from "../lib/pos-favorite-quickpick-styles";
import { PosFavoriteQuickPickChip } from "./PosFavoriteQuickPickChip";

const PREVIEW_LABELS = ["Café latte", "Agua 500ml", "Pan amasado"];

type Props = {
  size: PosFavoriteButtonSize;
};

export function PosFavoriteButtonSizePreview({ size }: Props) {
  const styles = getFavoriteButtonSizeStyles(size);

  return (
    <div
      className="rounded-lg border border-border bg-muted/30 px-2 py-2"
      data-test-id="pos-favorite-button-size-preview"
    >
      <p className="mb-2 text-xs text-muted-foreground">Vista previa</p>
      <div className={`flex flex-wrap ${styles.gapClass}`}>
        {PREVIEW_LABELS.map((label) => (
          <PosFavoriteQuickPickChip
            key={label}
            size={size}
            label={label}
            disabled
            data-test-id={`pos-favorite-size-preview-${label}`}
          />
        ))}
      </div>
    </div>
  );
}
