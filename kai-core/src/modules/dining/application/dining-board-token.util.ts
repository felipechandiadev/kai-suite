import { createHash, randomInt } from 'crypto';

/** Código de emparejamiento: exactamente 6 dígitos (000000–999999). */
export const DINING_BOARD_DISPLAY_TOKEN_LENGTH = 6;

export function normalizeDiningBoardDisplayToken(
  rawToken: string | null | undefined,
): string | null {
  if (rawToken == null) return null;
  const digits = String(rawToken).replace(/\D/g, '');
  if (digits.length !== DINING_BOARD_DISPLAY_TOKEN_LENGTH) return null;
  return digits;
}

export function isValidDiningBoardDisplayToken(
  rawToken: string | null | undefined,
): boolean {
  return normalizeDiningBoardDisplayToken(rawToken) != null;
}

export function hashDiningBoardDisplayToken(rawToken: string): string {
  const normalized =
    normalizeDiningBoardDisplayToken(rawToken) ?? String(rawToken).trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** Código numérico de 6 dígitos para pegar en la TV. */
export function generateDiningBoardDisplayToken(): string {
  return String(randomInt(0, 1_000_000)).padStart(
    DINING_BOARD_DISPLAY_TOKEN_LENGTH,
    '0',
  );
}
