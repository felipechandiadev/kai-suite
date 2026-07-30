export type VariantWithAttributes = {
  id: string;
  sku: string;
  attributeValues: Record<string, string>;
  inStock?: boolean;
};

function isInStock<T extends VariantWithAttributes>(variant: T): boolean {
  return variant.inStock !== false;
}

function matchesPartialSelection<T extends VariantWithAttributes>(
  variant: T,
  dimension: string,
  value: string,
  selection: Record<string, string>,
): boolean {
  if (variant.attributeValues[dimension] !== value) {
    return false;
  }
  for (const [key, selected] of Object.entries(selection)) {
    if (key === dimension || !selected) {
      continue;
    }
    if (variant.attributeValues[key] !== selected) {
      return false;
    }
  }
  return true;
}

export function findVariantByExactSelection<T extends VariantWithAttributes>(
  variants: T[],
  selection: Record<string, string>,
  dimensions: string[],
): T | null {
  if (dimensions.length === 0) {
    return variants[0] ?? null;
  }
  if (!dimensions.every((d) => Boolean(selection[d]?.trim()))) {
    return null;
  }
  return (
    variants.find((variant) =>
      dimensions.every((d) => variant.attributeValues[d] === selection[d]),
    ) ?? null
  );
}

/** Variante inicial: URL/preferida si tiene stock; si no, default con stock; si no, primera con stock. */
export function resolveInitialVariant<T extends VariantWithAttributes>(
  variants: T[],
  preferredVariantId?: string | null,
  defaultVariantId?: string | null,
): T | null {
  if (variants.length === 0) {
    return null;
  }

  const preferred =
    (preferredVariantId && variants.find((v) => v.id === preferredVariantId)) || null;
  if (preferred && isInStock(preferred)) {
    return preferred;
  }

  const fromDefault =
    (defaultVariantId && variants.find((v) => v.id === defaultVariantId)) || null;
  if (fromDefault && isInStock(fromDefault)) {
    return fromDefault;
  }

  const firstInStock = variants.find(isInStock);
  if (firstInStock) {
    return firstInStock;
  }

  return preferred ?? fromDefault ?? variants[0] ?? null;
}

export function selectionAfterOptionPick<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
  prevSelection: Record<string, string>,
  dimensions: string[],
): Record<string, string> {
  const candidates = variants.filter(
    (v) => isInStock(v) && v.attributeValues[dimension] === value,
  );
  if (candidates.length === 0) {
    return prevSelection;
  }
  if (candidates.length === 1) {
    return { ...candidates[0].attributeValues };
  }

  let best = candidates[0];
  let bestScore = -1;
  for (const variant of candidates) {
    let score = 0;
    for (const d of dimensions) {
      if (d === dimension) {
        continue;
      }
      const prev = prevSelection[d];
      if (prev && variant.attributeValues[d] === prev) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = variant;
    }
  }
  return { ...best.attributeValues };
}

/** Hay alguna variante con stock que encaja con la selección parcial actual. */
export function isOptionAvailable<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
  selection: Record<string, string>,
): boolean {
  return variants.some(
    (variant) =>
      isInStock(variant) &&
      matchesPartialSelection(variant, dimension, value, selection),
  );
}

export function isOptionCompatibleWithSelection<T extends VariantWithAttributes>(
  variants: T[],
  dimension: string,
  value: string,
  selection: Record<string, string>,
): boolean {
  return isOptionAvailable(variants, dimension, value, selection);
}
