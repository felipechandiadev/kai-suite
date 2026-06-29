import { useEffect, type ReactNode } from "react";
import { Button } from "../../../components/Button";

type AppDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

/** Modal compacto al ancho de la ventana KaiPrinters (~400px). */
export function AppDialog({ open, onClose, title, children, actions }: AppDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="print-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="print-dialog-panel w-full max-w-[min(100%,22.5rem)] rounded-lg border border-border bg-background shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2.5">
          <h2 id="print-dialog-title" className="text-sm font-semibold text-foreground">
            {title}
          </h2>
        </div>
        <div className="max-h-[min(60vh,16rem)] overflow-y-auto px-3 py-3 text-sm text-foreground">
          {children}
        </div>
        {actions ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-3 py-2.5">
            {actions}
          </div>
        ) : (
          <div className="flex justify-end border-t border-border px-3 py-2.5">
            <Button type="button" variant="contained-primary" density="compact" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
