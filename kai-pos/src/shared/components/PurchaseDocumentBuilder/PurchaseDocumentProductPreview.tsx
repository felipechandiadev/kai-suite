/** Vista compacta de producto/variante (buscador y tabla de líneas). */

function attributeValueParts(av: Record<string, string>): string[] {
  return Object.values(av)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Mismo separador circular que entre nombre y atributos (secondary, ~5px). */
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
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(amount),
    );
  } catch {
    return String(Math.round(amount));
  }
}

export function ProductNameWithAttributes({
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
