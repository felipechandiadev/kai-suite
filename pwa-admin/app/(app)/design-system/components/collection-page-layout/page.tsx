import { CollectionPageLayoutShowcaseClient } from "./CollectionPageLayoutShowcaseClient";
import { SearchQueryServerPreview } from "./SearchQueryServerPreview";
import { UrlSearchLive } from "./UrlSearchLive";
import { Suspense } from "react";
import { LoadingState } from '@kai/ui';

export default async function CollectionPageLayoutShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const searchRaw = sp.search;
  const searchFromUrl = typeof searchRaw === "string" ? searchRaw : "";

  return (
    <div className="p-4 md:p-6">
      <CollectionPageLayoutShowcaseClient
        contentGridColumns={{ default: 1, md: 2, lg: 2 }}
        contentItems={[
          <SearchQueryServerPreview key="server-preview" searchFromUrl={searchFromUrl} />,
          <Suspense
            key="url-client"
            fallback={
              <LoadingState className="flex items-center justify-center py-4" label="Cargando reflejo de la URL" data-test-id="url-search-live-skeleton" />
            }
          >
            <UrlSearchLive paramName="search" />
          </Suspense>,
        ]}
      />
    </div>
  );
}
