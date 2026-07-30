"use client";

import StockPageShell from "@/shared/components/StockPageShell/StockPageShell";

export default function StockAuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StockPageShell>{children}</StockPageShell>;
}
