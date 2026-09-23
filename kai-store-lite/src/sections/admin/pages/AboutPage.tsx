import { useState } from "react";
import { BasicPageLayout, IconButton } from "@kai/ui";
import { APP_CONFIG } from "@/config/app.config";
import { useLicense } from "@/providers/LicenseProvider";
import { ActivateLicenseDialog } from "@/sections/license/ActivateLicenseDialog";

const VERSION_BLURB =
  "Edición de escritorio para punto de venta y administración: ventas, catálogo e inventario local, impresión de tickets y licencia vinculada a este equipo. Una empresa, datos en SQLite, sin módulos de facturación electrónica ni e-commerce.";

export function AboutPage() {
  const { status } = useLicense();
  const [activateOpen, setActivateOpen] = useState(false);
  const showActivateEntry = status.kind === "trial" || status.kind === "none";

  return (
    <BasicPageLayout title="Acerca de" data-test-id="about-page">
      <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
        <img
          src="/kai-store-lite.png"
          alt=""
          width={96}
          height={96}
          className="mb-6 h-24 w-24 object-contain"
          draggable={false}
        />
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {APP_CONFIG.productName}
        </h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Versión {APP_CONFIG.version}
        </p>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          {VERSION_BLURB}
        </p>
        <div className="mt-10 space-y-1 text-sm text-foreground">
          <p className="font-medium">Desarrollado por Felipe Chandía Castillo</p>
          <p>Karmika SpA</p>
          <p>
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="mailto:felipe.chandia.cast@gmail.com"
            >
              felipe.chandia.cast@gmail.com
            </a>
          </p>
          <p>
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="tel:+56930978304"
            >
              +56 930978304
            </a>
          </p>
        </div>
      </div>

      {showActivateEntry ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-40">
          <IconButton
            icon="KeyRound"
            variant="text"
            size="sm"
            ariaLabel="Activar licencia"
            title="Activar licencia"
            onClick={() => setActivateOpen(true)}
            data-test-id="about-activate-license"
            className="pointer-events-auto text-muted-foreground/50 hover:text-muted-foreground"
          />
        </div>
      ) : null}

      <ActivateLicenseDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
      />
    </BasicPageLayout>
  );
}
