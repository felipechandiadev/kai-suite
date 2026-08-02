import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { PropinasReportesView } from "../ui/PropinasReportesView";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <PropinasReportesView />
    </Suspense>
  );
}
