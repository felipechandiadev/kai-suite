import StockAuthenticatedShell from "@/shared/components/StockAuthenticatedShell/StockAuthenticatedShell";

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return <StockAuthenticatedShell>{children}</StockAuthenticatedShell>;
}
