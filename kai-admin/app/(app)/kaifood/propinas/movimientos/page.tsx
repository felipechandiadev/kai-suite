import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { PropinasMovimientosView } from "../ui/PropinasMovimientosView";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <PropinasMovimientosView />
    </Suspense>
  );
}
