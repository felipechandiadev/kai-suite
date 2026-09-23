import { Dialog } from "@kai/ui";
import { ActivateLicenseForm } from "./ActivateLicenseForm";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ActivateLicenseDialog({ open, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Activar licencia"
      data-test-id="activate-license-dialog"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Ingresá el código de activación. Queda vinculado a este equipo y podés
        usarlo antes de que termine el período de prueba.
      </p>
      <ActivateLicenseForm onActivated={onClose} />
    </Dialog>
  );
}
