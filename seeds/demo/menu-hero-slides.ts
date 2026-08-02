import type {
  MenuHeroSlideCtaStyle,
  MenuHeroSlideTextAlign,
} from '@modules/menu/domain/menu-hero-slide.entity';

export type SeedDevMenuHeroSlideDef = {
  key: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaStyle: MenuHeroSlideCtaStyle;
  textAlign: MenuHeroSlideTextAlign;
  overlayOpacity: number;
  textColor: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Relativo a `seeds/demo/assets/`. */
  imageFile?: string;
};

/** Hero Kai Menú — Restó Demo (cafetería / pastelería). */
export const SEED_DEV_MENU_HERO_SLIDES: readonly SeedDevMenuHeroSlideDef[] = [
  {
    key: 'cafe-especialidad',
    title: 'Café de especialidad',
    subtitle:
      'Grano seleccionado y latte art en cada taza. El ritual perfecto para empezar el día.',
    ctaLabel: 'Ver carta',
    ctaHref: '#menu',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 42,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 1,
    imageFile: 'menu-hero-slides/01-cafe-especialidad.png',
  },
  {
    key: 'pasteleria-frutos',
    title: 'Pastelería artesanal',
    subtitle:
      'Cheesecake cremoso con frutos del bosque, horneado cada mañana en nuestra cocina.',
    ctaLabel: 'Nuestra carta',
    ctaHref: '#menu',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 38,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 2,
    imageFile: 'menu-hero-slides/02-pasteleria-frutos.png',
  },
  {
    key: 'mousse-chocolate',
    title: 'Tentación de chocolate',
    subtitle:
      'Mousse triple chocolate con ganache brillante. Pura indulgencia en cada bocado.',
    ctaLabel: 'Descubrir',
    ctaHref: '#menu',
    ctaStyle: 'button',
    textAlign: 'left',
    overlayOpacity: 45,
    textColor: '#FFFFFF',
    isActive: true,
    sortOrder: 3,
    imageFile: 'menu-hero-slides/03-mousse-chocolate.png',
  },
] as const;
