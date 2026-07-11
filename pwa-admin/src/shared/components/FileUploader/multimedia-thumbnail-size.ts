export type MultimediaThumbnailAspectRatio = "1:1" | "16:9";
export type MultimediaThumbnailSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

function thumbnailMaxWidthClass(size: MultimediaThumbnailSize | undefined): string {
  const key = size ?? "md";
  if (key === "xs") return "max-w-[200px]";
  if (key === "sm") return "max-w-[280px]";
  if (key === "md") return "max-w-[480px]";
  if (key === "lg") return "max-w-[640px]";
  if (key === "xl") return "max-w-[960px]";
  return "max-w-none";
}

export function thumbnailAreaClassName(
  aspectRatio: MultimediaThumbnailAspectRatio,
  size: MultimediaThumbnailSize | undefined,
  centered: boolean,
  options?: { useDefaultBackground?: boolean },
): string {
  const aspectClass = aspectRatio === "1:1" ? "aspect-square" : "aspect-video";
  const centerClass = centered ? "mx-auto" : "";
  const useDefaultBackground = options?.useDefaultBackground !== false;
  return [
    "relative w-full overflow-hidden flex items-center justify-center cursor-pointer rounded-lg border border-border transition-colors hover:border-primary",
    useDefaultBackground ? "bg-muted/25" : "",
    thumbnailMaxWidthClass(size),
    aspectClass,
    centerClass,
  ]
    .filter(Boolean)
    .join(" ");
}

export function thumbnailPlaceholderIconDimension(
  size: MultimediaThumbnailSize | undefined,
): number {
  const map: Record<MultimediaThumbnailSize, number> = {
    xs: 32,
    sm: 40,
    md: 52,
    lg: 56,
    xl: 64,
    full: 72,
  };
  return map[size ?? "md"];
}
