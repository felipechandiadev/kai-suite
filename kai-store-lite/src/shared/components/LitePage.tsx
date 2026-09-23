import type { ReactNode } from "react";
import { BasicPageLayout } from "@kai/ui";

/** POS / páginas simples: alias de BasicPageLayout. Admin usa layouts por tipo de sección. */
export function LitePage({
  title,
  subtitle,
  headerActions,
  children,
  testId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <BasicPageLayout
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      data-test-id={testId}
      className="h-full overflow-auto"
      contentClassName="pb-8"
    >
      {children}
    </BasicPageLayout>
  );
}
