/**
 * Ancho del área banner (16:9): vista previa y estado vacío antes de cargar.
 */
export type MultimediaBannerSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

/** Clases Tailwind para el contenedor banner (aspect-video + ancho máximo). */
export function bannerAreaClassName(size: MultimediaBannerSize | undefined): string {
  const key = size ?? "md";
  const width =
    key === "xs"
      ? "max-w-[200px]"
      : key === "sm"
        ? "max-w-[280px]"
        : key === "md"
          ? "max-w-[480px]"
          : key === "lg"
            ? "max-w-[640px]"
            : key === "xl"
              ? "max-w-[960px]"
              : "max-w-none";
  const center = key === "full" ? "" : "mx-auto";
  return `relative w-full ${width} aspect-video overflow-hidden flex items-center justify-center cursor-pointer rounded-lg transition-colors hover:opacity-95 ${center}`.trim();
}

/** Tamaño del icono placeholder (estado sin imagen). */
export function bannerPlaceholderIconDimension(size: MultimediaBannerSize | undefined): number {
  const map: Record<MultimediaBannerSize, number> = {
    xs: 32,
    sm: 40,
    md: 52,
    lg: 56,
    xl: 64,
    full: 72,
  };
  return map[size ?? "md"];
}
