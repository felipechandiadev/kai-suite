import type {
  EShopHeroSlideCtaStyle,
  EShopHeroSlideTextAlign,
} from '@modules/e-shop/domain/e-shop-hero-slide.entity';

export type SeedDevEshopHeroSlideDef = {
  /** Clave estable para logs y nombre de archivo sugerido. */
  key: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaStyle: EShopHeroSlideCtaStyle;
  textAlign: EShopHeroSlideTextAlign;
  overlayOpacity: number;
  textColor: string | null;
  isActive: boolean;
  sortOrder: number;
  /**
   * Imagen 16:9 opcional relativa a `seed/assets/`.
   * Si el archivo no existe, el slide se crea sin imagen (subir luego en admin).
   */
  imageFile?: string;
};

/** Hero slides demo KaiStore / eShop (orden = carrusel home). */
export const SEED_DEV_ESHOP_HERO_SLIDES: readonly SeedDevEshopHeroSlideDef[] = [
  {
    key: 'calcetines-deportivos',
    title: 'Calcetines deportivos',
    subtitle: 'Tecnología y confort para entrenar. Varias tallas y colores disponibles.',
    ctaLabel: 'Ver productos',
    ctaHref: '#productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 45,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 1,
    imageFile: 'hero-slides/01-calcetines-deportivos.png',
  },
  {
    key: 'polera-algodon',
    title: 'Polera algodón premium',
    subtitle: 'Estilo urbano con algodón suave. El básico que no puede faltar.',
    ctaLabel: 'Explorar textil',
    ctaHref: '#productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 40,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 2,
    imageFile: 'hero-slides/02-polera-algodon.png',
  },
  {
    key: 'toalla-bano',
    title: 'Toalla baño algodón',
    subtitle: 'Secado rápido y máxima absorción para tu hogar.',
    ctaLabel: 'Descubrir hogar',
    ctaHref: '#productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 42,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 3,
    imageFile: 'hero-slides/03-toalla-bano.png',
  },
] as const;
