import type { MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";
import type { MultimediaFieldLayout, MultimediaSingleVariant } from "./types";

export type MultimediaEntityDefaults = {
  layout: MultimediaFieldLayout;
  singleVariant?: MultimediaSingleVariant;
  allowPrimary: boolean;
  allowReorder: boolean;
  enableGallery: boolean;
  pickButton: "icon" | "normal";
};

export function multimediaDefaultsForEntity(
  entityType: MultimediaEntityType,
): MultimediaEntityDefaults {
  switch (entityType) {
    case "product":
    case "product-variant":
      return {
        layout: "collection",
        allowPrimary: true,
        allowReorder: true,
        enableGallery: true,
        pickButton: entityType === "product-variant" ? "icon" : "icon",
      };
    case "company":
      return {
        layout: "single",
        singleVariant: "logo",
        allowPrimary: true,
        allowReorder: false,
        enableGallery: true,
        pickButton: "icon",
      };
    case "employee":
      return {
        layout: "single",
        singleVariant: "avatar",
        allowPrimary: true,
        allowReorder: false,
        enableGallery: true,
        pickButton: "icon",
      };
    case "brand":
    case "e-shop-hero-slide":
    case "menu-hero-slide":
    case "e-shop-testimonial":
      return {
        layout: "collection",
        allowPrimary: false,
        allowReorder: false,
        enableGallery: true,
        pickButton: "icon",
      };
    default:
      return {
        layout: "collection",
        allowPrimary: false,
        allowReorder: false,
        enableGallery: true,
        pickButton: "icon",
      };
  }
}
