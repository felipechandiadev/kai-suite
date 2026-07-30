import { Suspense } from "react";
import SearchPageContent from "@/features/variant/components/SearchPageContent";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

type SearchRoutePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function SearchRoutePage({ searchParams }: SearchRoutePageProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPageContent searchParams={searchParams} />
    </Suspense>
  );
}
