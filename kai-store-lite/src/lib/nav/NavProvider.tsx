import { createContext, useContext, type ReactNode } from "react";

/** Adapter so @kai/ui / Lite shells navigate without next/navigation. */
export type NavAdapter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  pathname: () => string;
};

const NavContext = createContext<NavAdapter | null>(null);

export function NavProvider({
  adapter,
  children,
}: {
  adapter: NavAdapter;
  children: ReactNode;
}) {
  return <NavContext.Provider value={adapter}>{children}</NavContext.Provider>;
}

export function useNav(): NavAdapter {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav outside NavProvider");
  return ctx;
}
