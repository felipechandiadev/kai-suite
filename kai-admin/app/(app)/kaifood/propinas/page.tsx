import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { PropinasResumenView } from "./ui/PropinasResumenView";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <PropinasResumenView />
    </Suspense>
  );
}
