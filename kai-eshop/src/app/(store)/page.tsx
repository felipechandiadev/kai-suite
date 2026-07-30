import { EShopHeroSlider } from "@/shared/components/EShopHeroSlider";
import { EShopProductCard } from "@/shared/components/EShopProductCard";
import { StorePageShell } from "@/shared/components/StorePageShell";
import {
  getFeaturedProductsAction,
  getHeroSlidesAction,
  getTestimonialsAction,
  getBranchesAction,
} from "@/features/e-shop-storefront/actions/storefront.action";
import Link from "next/link";
import { BranchesMap } from "./ui/BranchesMap";
import { EShopTestimonialsCarousel } from "@/shared/components/EShopTestimonialsCarousel";

export default async function HomePage() {
  const [hero, featured, testimonials, branches] = await Promise.all([
    getHeroSlidesAction(),
    getFeaturedProductsAction(),
    getTestimonialsAction(),
    getBranchesAction(),
  ]);

  return (
    <>
      <EShopHeroSlider slides={hero.slides} autoplaySeconds={hero.autoplaySeconds} />

      <StorePageShell className="space-y-16">
        <section id="productos" className="scroll-mt-20 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-base font-semibold md:text-xl">Productos destacados</h2>
            <Link href="/productos" className="text-xs text-primary hover:underline md:text-sm">
              Ver catálogo completo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.items.map((p) => (
              <EShopProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <section id="testimonios" className="scroll-mt-20">
          <EShopTestimonialsCarousel testimonials={testimonials} />
        </section>

        <section id="donde-estamos" className="scroll-mt-20 space-y-4">
          <h2 className="text-base font-semibold md:text-xl">Encuéntranos</h2>
          <BranchesMap branches={branches} zoomButtonsOnly />
        </section>
      </StorePageShell>
    </>
  );
}
