import { AdminScaleSettingsForm } from "./AdminScaleSettingsForm";

export default function ScaleSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Balanza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte la balanza por cable serial (puerto COM en Windows). Seleccione el puerto en Chrome,
          pruebe la comunicación y el pesaje para la calculadora de joyería.
        </p>
      </div>
      <AdminScaleSettingsForm />
    </div>
  );
}
