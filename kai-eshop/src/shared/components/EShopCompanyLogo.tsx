"use client";

import { useState } from "react";

type Props = {
  companyName: string;
  logoUrl: string | null | undefined;
  /** Top bar: compacto. Footer: más grande. */
  size?: "sm" | "md";
  className?: string;
  /** Se invoca si la imagen falla al cargar (para fallback en el padre). */
  onError?: () => void;
};

export function EShopCompanyLogo({
  companyName,
  logoUrl,
  size = "sm",
  className = "",
  onError,
}: Props) {
  const src = logoUrl?.trim() ?? "";
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  const dim = size === "md" ? "h-10 w-auto max-w-[140px]" : "h-8 w-auto max-w-[120px]";

  return (
    <div className={`inline-flex shrink-0 items-center ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica del backend (multimedia empresa). */}
      <img
        src={src}
        alt={companyName}
        className={`${dim} object-contain`}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
      />
    </div>
  );
}
