import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import ReceptionNewPageContent from "./ReceptionNewPageContent";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function ReceptionNewFallback() {
  return (
    <LoadingState className="flex items-center justify-center min-h-0 min-w-0 p-3 py-4" label="Cargando búsqueda" data-test-id="receptions-new-skeleton" />
  );
}

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  noStore();

  return (
    <Suspense fallback={<ReceptionNewFallback />}>
      <ReceptionNewPageContent searchParams={searchParams} />
    </Suspense>
  );
}
