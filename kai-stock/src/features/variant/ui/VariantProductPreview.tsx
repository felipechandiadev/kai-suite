function attributeValueParts(av: Record<string, string>): string[] {
  return Object.values(av)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function variantAttributeValueBadges(
  av: Record<string, string>,
): Array<{ key: string; value: string }> {
  if (!av || typeof av !== "object") {
    return [];
  }
  return Object.entries(av)
    .map(([key, val]) => ({ key, value: val != null ? String(val).trim() : "" }))
    .filter((x) => x.value.length > 0);
}

export function InlineSepDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full bg-secondary align-middle"
    />
  );
}

export function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return String(Math.round(amount));
  }
}

export function VariantProductNameWithAttributes({
  name,
  attributeValues,
  className = "",
}: {
  name: string;
  attributeValues: Record<string, string>;
  className?: string;
}) {
  const parts = attributeValueParts(attributeValues);
  const label = [name, ...parts].join(" · ");
  return (
    <p className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`.trim()} title={label}>
      <span className="min-w-0">{name}</span>
      {parts.map((part, i) => (
        <span key={`${i}-${part}`} className="inline-flex min-w-0 items-center gap-x-1.5">
          <InlineSepDot />
          <span className="shrink-0">{part}</span>
        </span>
      ))}
    </p>
  );
}
