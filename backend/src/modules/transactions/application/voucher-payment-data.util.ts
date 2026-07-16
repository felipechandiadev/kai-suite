/** Normaliza voucherData para snapshot / metadata (campos limpios). */
export function normalizeVoucherPaymentData(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const kindCode = String(raw.kindCode ?? '')
    .trim()
    .replace(/-/g, '')
    .toUpperCase();
  const kindId =
    typeof raw.kindId === 'string' && raw.kindId.trim()
      ? raw.kindId.trim()
      : null;
  const kindName =
    typeof raw.kindName === 'string' && raw.kindName.trim()
      ? raw.kindName.trim()
      : null;
  if (!kindCode && !kindId) return null;
  const faceRaw = raw.faceValue;
  const faceValue =
    faceRaw != null && Number.isFinite(Number(faceRaw))
      ? Math.round(Number(faceRaw))
      : null;
  const issuerName =
    typeof raw.issuerName === 'string' && raw.issuerName.trim()
      ? raw.issuerName.trim()
      : null;
  const expiresAt =
    typeof raw.expiresAt === 'string' && raw.expiresAt.trim()
      ? raw.expiresAt.trim()
      : null;
  return {
    kindId,
    kindCode: kindCode || null,
    kindName,
    issuerName,
    faceValue,
    expiresAt,
  };
}
