"use client";

import type { WaiterProductAttributeDto } from "../infrastructure/dining.request";

type Props = {
  name: string;
  attributes?: WaiterProductAttributeDto[];
  className?: string;
};

export function WaiterProductNameWithAttributes({
  name,
  attributes,
  className,
}: Props) {
  const attrs = (attributes ?? []).filter(
    (a) => a.attributeName.trim() || a.attributeValue.trim(),
  );
  return (
    <span className={className}>
      <span>{name}</span>
      {attrs.length > 0 ? (
        <span className="font-normal text-muted-foreground">
          {" · "}
          {attrs
            .map((a) =>
              a.attributeValue.trim()
                ? `${a.attributeName}: ${a.attributeValue}`
                : a.attributeName,
            )
            .join(" · ")}
        </span>
      ) : null}
    </span>
  );
}
