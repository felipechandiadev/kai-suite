export function validateMultimediaFileSize(file: File, maxSizeMb: number): string | null {
  const isVideo = file.type.startsWith("video/");
  const maxBytes = isVideo ? 70 * 1024 * 1024 : maxSizeMb * 1024 * 1024;
  const maxLabel = isVideo ? "70MB" : `${maxSizeMb}MB`;
  const fileType = isVideo ? "videos" : "imágenes";
  if (file.size > maxBytes) {
    return `El archivo excede el límite de ${maxLabel} para ${fileType}`;
  }
  return null;
}

export function filterValidMultimediaFiles(
  incoming: File[],
  options: {
    acceptPattern?: RegExp;
    maxSizeMb: number;
    maxFiles: number;
    currentCount: number;
  },
): { valid: File[]; errors: string[] } {
  const acceptPattern = options.acceptPattern ?? /^(image|video)\//;
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of incoming) {
    if (!file.type.match(acceptPattern)) {
      errors.push(`${file.name}: Solo se permiten imágenes y videos`);
      continue;
    }
    const sizeError = validateMultimediaFileSize(file, options.maxSizeMb);
    if (sizeError) {
      errors.push(`${file.name}: ${sizeError}`);
      continue;
    }
    valid.push(file);
  }

  const total = options.currentCount + valid.length;
  if (total > options.maxFiles) {
    errors.push(
      `Solo se permiten máximo ${options.maxFiles} archivo(s). Actualmente hay ${options.currentCount}, intenta agregar ${valid.length}.`,
    );
    return { valid: [], errors };
  }

  return { valid, errors };
}
