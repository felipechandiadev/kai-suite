import type { ReactNode } from "react";

/** Legacy: SII vive en /sii; este layout solo envuelve redirects. */
export default function LegacySiiSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
