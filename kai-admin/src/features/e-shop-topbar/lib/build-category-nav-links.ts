import type { CategoryListItem } from "@/features/inventory-categories/types/category.types";
import type { EShopNavLink } from "../types/eshop-topbar.types";
import { buildEShopProductCategoryNavHref, isEShopProductCategoryNavHref } from "./eshop-category-nav-href";

export const ESHOP_TOPBAR_NAV_LINKS_MAX = 8;

export type CategoryNavLinkMode = "replace" | "append";

export type BuildCategoryNavLinksResult = {
  navLinks: EShopNavLink[];
  omittedCount: number;
};

function isReplaceableCategoryNavLink(link: EShopNavLink, selectedNames: Set<string>): boolean {
  if (isEShopProductCategoryNavHref(link.href)) return true;
  if (link.href.trim() === "/productos" && selectedNames.has(link.label.trim())) return true;
  return false;
}

export function buildCategoryNavLinksFromSelection(
  selectedCategories: CategoryListItem[],
  existingLinks: EShopNavLink[],
  mode: CategoryNavLinkMode,
): BuildCategoryNavLinksResult {
  const generated: EShopNavLink[] = selectedCategories.map((category, index) => ({
    id: crypto.randomUUID(),
    label: category.name,
    kind: "route" as const,
    href: buildEShopProductCategoryNavHref(category.id),
    enabled: true,
    order: index,
  }));

  const selectedNames = new Set(selectedCategories.map((c) => c.name.trim()));

  let merged: EShopNavLink[];
  if (mode === "replace") {
    const kept = existingLinks.filter((link) => !isReplaceableCategoryNavLink(link, selectedNames));
    merged = [...kept, ...generated];
  } else {
    merged = [...existingLinks, ...generated];
  }

  const omittedCount = Math.max(0, merged.length - ESHOP_TOPBAR_NAV_LINKS_MAX);
  const navLinks = merged.slice(0, ESHOP_TOPBAR_NAV_LINKS_MAX).map((link, index) => ({
    ...link,
    order: index,
  }));

  return { navLinks, omittedCount };
}
