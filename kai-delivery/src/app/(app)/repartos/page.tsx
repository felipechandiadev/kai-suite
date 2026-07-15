import { Suspense } from "react";
import { CourierRepartosPanel } from "@/features/courier/ui/CourierRepartosPanel";

export default function RepartosPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[40vh] w-full items-center justify-center"
          data-test-id="repartos-suspense"
        />
      }
    >
      <CourierRepartosPanel />
    </Suspense>
  );
}
