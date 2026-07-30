import { Suspense } from "react";
import { listHeroSlidesAction } from "@/features/e-shop-hero-slides/actions/hero-slide.action";
import { HeroSlidesCollection } from "./components/HeroSlidesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function EShopHeroSlidesPage() {
  const initialSlides = await listHeroSlidesAction();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="hero-slides-page-skeleton" />
      }
    >
      <HeroSlidesCollection initialSlides={initialSlides} />
    </Suspense>
  );
}
