import type { ReactNode } from "react";
import { storeContentContainerClassName } from "@/shared/layout/store-content-layout";

type StorePageShellProps = {
  children: ReactNode;
  className?: string;
};

export function StorePageShell({ children, className = "" }: StorePageShellProps) {
  return (
    <div className={`${storeContentContainerClassName} py-6 ${className}`.trim()}>{children}</div>
  );
}
