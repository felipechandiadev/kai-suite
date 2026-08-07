export const TICKET_PAPER_PROFILE_OPTIONS = [
  { id: "58mm", label: "58 mm" },
  { id: "80mm", label: "80 mm" },
] as const;

export const DOCUMENT_PAPER_PROFILE_OPTIONS = [
  { id: "letter", label: "Carta (Letter)" },
  { id: "a4", label: "A4" },
] as const;

export function defaultPaperProfileForPurpose(purpose: string): string {
  return purpose === "documents" ? "a4" : "80mm";
}

export function normalizePaperProfile(purpose: string, raw?: string | null): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (purpose === "documents") {
    return v === "letter" ? "letter" : "a4";
  }
  if (purpose === "tickets" || purpose === "comandas") {
    return v === "58mm" ? "58mm" : "80mm";
  }
  return defaultPaperProfileForPurpose(purpose);
}
