"use client";

import { TabPageLayout } from "@kai/ui";
import { Tabs } from "@kai/ui";

const SHOWCASE_TABS = [
  { label: "General", url: "/design-system/components/tab-page-layout" },
  { label: "Button", url: "/design-system/components/button" },
  { label: "TextField", url: "/design-system/components/textfield" },
];

export function TabPageLayoutShowcaseClient() {
  return (
    <>
      <TabPageLayout
        title="TabPageLayout"
        subtitle="En md+ títulos (izquierda) y pestañas (derecha) comparten la misma fila en un grid, a la misma altura; en viewport angosto se apilan."
        tabs={
          <div className="w-full min-w-0 border-b border-border">
            <Tabs items={SHOWCASE_TABS} activeTab="/design-system/components/tab-page-layout" />
          </div>
        }
        data-test-id="ui-showcase-tab-page-layout-main"
      >
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Área de contenido bajo{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">
            tab-page-layout-content
          </code>
          . Las pestañas son enlaces reales; aquí la activa se fuerza con{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs text-foreground">activeTab</code> para la demo.
        </div>
      </TabPageLayout>

      <div className="mt-10 rounded-lg border border-dashed border-border p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variante: solo pestañas (sin título)
        </p>
        <TabPageLayout
          tabs={
            <div className="w-full min-w-0 border-b border-border">
              <Tabs items={SHOWCASE_TABS} activeTab="/design-system/components/button" />
            </div>
          }
          data-test-id="ui-showcase-tab-page-layout-tabs-only"
        >
          <p className="text-sm text-muted-foreground">
            Útil cuando el título vive en el shell, breadcrumbs u otro bloque.
          </p>
        </TabPageLayout>
      </div>
    </>
  );
}
