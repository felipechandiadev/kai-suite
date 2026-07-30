import { KaiAppAboutPanel } from "@kai-shared/kai-app-about/KaiAppAboutPanel";

export default function EShopAboutPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Acerca de</h1>
      <KaiAppAboutPanel appName="KaiStore eShop" productLabel="KaiStore" />
    </div>
  );
}
