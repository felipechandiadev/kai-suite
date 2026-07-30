export type EShopHeroSlideTextAlign = "left" | "center" | "right";
export type EShopHeroSlideCtaStyle = "none" | "button" | "link";

export type EShopHeroSlideRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: EShopHeroSlideCtaStyle;
  isActive: boolean;
  sortOrder: number;
  textAlign: EShopHeroSlideTextAlign;
  overlayOpacity: number;
  textColor?: string | null;
  imageUrl?: string | null;
};

export type CreateHeroSlideResult =
  | { success: true; slide: EShopHeroSlideRow }
  | { success: false; error: string };

export type UpdateHeroSlideResult =
  | { success: true; slide: EShopHeroSlideRow }
  | { success: false; error: string };

export type DeleteHeroSlideResult = { success: true } | { success: false; error: string };

export type ReorderHeroSlidesResult =
  | { success: true; slides: EShopHeroSlideRow[] }
  | { success: false; error: string };
