/** Heurística: código de ticket de preventa (alfanumérico, sin guiones). */
export function looksLikePresaleTicketCode(query: string): boolean {
  const q = query.trim().toUpperCase();
  if (q.length < 16 || q.length > 24) return false;
  if (/\s/.test(q)) return false;
  return /^[A-Z0-9]+$/.test(q);
}
