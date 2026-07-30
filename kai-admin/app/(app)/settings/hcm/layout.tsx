import { redirect } from "next/navigation";

export default function LegacySettingsHcmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Subpaths redirected via next.config; root handled by page.tsx
  return children;
}
