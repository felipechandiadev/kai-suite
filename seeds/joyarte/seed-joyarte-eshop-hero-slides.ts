import type {
  EShopHeroSlideCtaStyle,
  EShopHeroSlideTextAlign,
} from '@modules/e-shop/domain/e-shop-hero-slide.entity';

export type SeedJoyarteEshopHeroSlideDef = {
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
  imageFile?: string;
};

export const SEED_JOYARTE_ESHOP_HERO_SLIDES: readonly SeedJoyarteEshopHeroSlideDef[] = [
  {
    key: 'novios',
    title: 'Edición Novios',
    subtitle: 'Anillos de compromiso y argollas de matrimonio. Cada historia merece brillar.',
    ctaLabel: 'Ver colección',
    ctaHref: '/productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 42,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 1,
    imageFile: 'hero-slides/01-novios.jpg',
  },
  {
    key: 'oro-18kt',
    title: 'Joyas de Oro 18kt',
    subtitle: 'Diseños exclusivos en oro amarillo, blanco y miel.',
    ctaLabel: 'Explorar oro',
    ctaHref: '/productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 40,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 2,
    imageFile: 'hero-slides/02-oro.jpg',
  },
  {
    key: 'plata-925',
    title: 'Plata Esterlina 925',
    subtitle: 'Piezas delicadas para el día a día con calidad certificada.',
    ctaLabel: 'Ver plata',
    ctaHref: '/productos',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 38,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 3,
    imageFile: 'hero-slides/03-plata.jpg',
  },
] as const;
