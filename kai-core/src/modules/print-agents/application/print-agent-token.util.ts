import { createHash, randomBytes } from 'crypto';

/** Token opaco del agente (hex). Más largo que Board TV (6 dígitos). */
export const PRINT_AGENT_TOKEN_BYTES = 24;

export function normalizePrintAgentToken(
  rawToken: string | null | undefined,
): string | null {
  if (rawToken == null) return null;
  const t = String(rawToken).trim().toLowerCase();
  if (!/^[a-f0-9]{32,96}$/.test(t)) return null;
  return t;
}

export function isValidPrintAgentToken(
  rawToken: string | null | undefined,
): boolean {
  return normalizePrintAgentToken(rawToken) != null;
}

export function hashPrintAgentToken(rawToken: string): string {
  const normalized =
    normalizePrintAgentToken(rawToken) ?? String(rawToken).trim().toLowerCase();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function generatePrintAgentToken(): string {
  return randomBytes(PRINT_AGENT_TOKEN_BYTES).toString('hex');
}
