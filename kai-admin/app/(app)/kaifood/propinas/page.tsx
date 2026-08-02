import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { PropinasHubShell } from "./ui/PropinasHubShell";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState className="p-6" />}>
      <PropinasHubShell />
    </Suspense>
  );
}
