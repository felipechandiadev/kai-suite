export type MenuHeroSlideTextAlign = "left" | "center" | "right";
export type MenuHeroSlideCtaStyle = "none" | "button" | "link";

export type MenuHeroSlideRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: MenuHeroSlideCtaStyle;
  isActive: boolean;
  sortOrder: number;
  textAlign: MenuHeroSlideTextAlign;
  overlayOpacity: number;
  textColor?: string | null;
  imageUrl?: string | null;
};

export type CreateHeroSlideResult =
  | { success: true; slide: MenuHeroSlideRow }
  | { success: false; error: string };

export type UpdateHeroSlideResult =
  | { success: true; slide: MenuHeroSlideRow }
  | { success: false; error: string };

export type DeleteHeroSlideResult = { success: true } | { success: false; error: string };

export type ReorderHeroSlidesResult =
  | { success: true; slides: MenuHeroSlideRow[] }
  | { success: false; error: string };
