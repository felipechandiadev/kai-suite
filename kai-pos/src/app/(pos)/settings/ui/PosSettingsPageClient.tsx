"use client";

import { useRouter } from "next/navigation";
import { PosFavoriteProductsSection } from "@/features/pos-settings/ui/PosFavoriteProductsSection";
import { OfflineConflictPanel } from "@/features/pos-offline/ui/OfflineConflictPanel";
import { PosDiningEnabledTabsSettings } from "@/features/dining/ui/PosDiningEnabledTabsSettings";
import { IconButton } from "@kai/ui";

type SettingsSectionProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
  badge?: string;
  "data-test-id"?: string;
};

function SettingsSection({
  title,
  description,
  children,
  badge,
  "data-test-id": testId,
}: SettingsSectionProps) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-background)",
      }}
      data-test-id={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: "var(--color-muted-foreground, #737373)" }}
          >
            {description}
          </p>
        </div>
        {badge ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: "var(--color-muted, #f5f5f5)",
              color: "var(--color-muted-foreground, #737373)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function PosSettingsPageClient() {
  const router = useRouter();

  return (
    <div
      className="mx-auto max-w-3xl space-y-6 px-6 py-6"
      data-test-id="pos-settings-page"
    >
      <header>
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          Configuración del punto de venta
        </h1>
      </header>

      <div className="space-y-4">
        <SettingsSection
          title="Productos favoritos"
          description="Atajos en la pantalla de venta para agregar al carrito los productos que uses con más frecuencia en este punto de venta."
          data-test-id="pos-settings-favorites-section"
        >
          <PosFavoriteProductsSection />
        </SettingsSection>

        <PosDiningEnabledTabsSettings />

        <SettingsSection
          title="Impresión y tickets"
          description="Conexión al servicio local de impresión y modos de comprobante por tipo de documento."
          data-test-id="pos-settings-print-section"
        >
          <div className="flex justify-end">
            <IconButton
              icon="Printer"
              variant="outlined"
              size="sm"
              ariaLabel="Configurar impresión local"
              title="Impresión local"
              onClick={() => router.push("/settings/local-printing")}
              data-test-id="pos-settings-print-link"
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Pantalla cliente"
          description="Visor de cliente (Kai CFD) en la segunda pantalla de la tablet: carrito, pago y mensaje de bienvenida para el cliente."
          data-test-id="pos-settings-customer-display-section"
        >
          <div className="flex justify-end">
            <IconButton
              icon="Monitor"
              variant="outlined"
              size="sm"
              ariaLabel="Configurar pantalla cliente"
              title="Pantalla cliente"
              onClick={() => router.push("/settings/customer-display")}
              data-test-id="pos-settings-customer-display-link"
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Kai Board"
          description="Monitor TV de pedidos en preparación y listos para retirar (código de 6 dígitos)."
          data-test-id="pos-settings-kai-board-section"
        >
          <div className="flex justify-end">
            <IconButton
              icon="Tv"
              variant="outlined"
              size="sm"
              ariaLabel="Configurar Kai Board"
              title="Kai Board"
              onClick={() => router.push("/settings/kai-board")}
              data-test-id="pos-settings-kai-board-link"
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Cola offline y conflictos"
          description="Operaciones pendientes de sincronizar, fallidas o en conflicto (stock, folio, sesión)."
          badge="Offline"
          data-test-id="pos-settings-offline-conflicts-section"
        >
          <OfflineConflictPanel />
        </SettingsSection>

        <SettingsSection
          title="Acerca de"
          description="Versión de la aplicación, backend y Kai Printers."
          data-test-id="pos-settings-about-section"
        >
          <div className="flex justify-end">
            <IconButton
              icon="Info"
              variant="outlined"
              size="sm"
              ariaLabel="Acerca de KaiStore POS"
              title="Acerca de"
              onClick={() => router.push("/settings/about")}
              data-test-id="pos-settings-about-link"
            />
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
