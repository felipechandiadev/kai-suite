const MAX_IMAGE_MB = 9;

export function validateVariantImageFile(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "Archivo no válido";
  }
  if (!file.type.startsWith("image/")) {
    return "Solo se permiten imágenes";
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `La imagen no puede superar ${MAX_IMAGE_MB} MB`;
  }
  return null;
}
