import { AdminScaleSettingsForm } from "./AdminScaleSettingsForm";

export default function ScaleSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Balanza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure la balanza USB-serial para leer peso en la calculadora de precio de joyería.
        </p>
      </div>
      <AdminScaleSettingsForm />
    </div>
  );
}
