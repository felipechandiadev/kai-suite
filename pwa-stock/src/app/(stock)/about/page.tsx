import { KaiAppAboutPanel } from "@kai-shared/kai-app-about/KaiAppAboutPanel";

export default function StockAboutPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">Acerca de</h1>
      <KaiAppAboutPanel appName="KaiStore Stock" productLabel="KaiStore" />
    </div>
  );
}
