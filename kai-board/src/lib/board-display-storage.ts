const STORAGE_KEY = "kai-board-display";

export type BoardDisplaySession = {
  token: string;
  pairedAt: string;
};

function normalizeToken(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

export function getBoardDisplayToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoardDisplaySession;
    const token =
      typeof parsed?.token === "string" ? normalizeToken(parsed.token) : null;
    return token;
  } catch {
    return null;
  }
}

export function saveBoardDisplayToken(token: string): void {
  const normalized = normalizeToken(token);
  if (!normalized) {
    throw new Error("El código debe tener 6 dígitos");
  }
  const session: BoardDisplaySession = {
    token: normalized,
    pairedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearBoardDisplayToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}
