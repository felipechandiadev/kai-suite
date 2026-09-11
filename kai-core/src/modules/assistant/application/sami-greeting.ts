const GREETING_RE =
  /^(hola+|buenas?(?:\s+(d[ií]as|tardes|noches))?|qu[eé]\s+tal|c[oó]mo\s+est[aá]s?|c[oó]mo\s+estai|hi+|hey|hello)([\s!.,?¿¡]*)$/i;

/** Saludo corto (no sirve como título de conversación). */
export function isSamiGreeting(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return true;
  if (t.length > 80) return false;
  if (GREETING_RE.test(t)) return true;
  return /^(hola|buenas)\b.{0,48}\b(c[oó]mo\s+est[aá]s?|c[oó]mo\s+estai|qu[eé]\s+tal)\b[\s!.,?¿¡]*$/i.test(
    t,
  );
}

export function conversationTitleFromUserText(userText: string): string | null {
  const t = userText.replace(/\s+/g, ' ').trim();
  if (!t || isSamiGreeting(t)) return null;
  return t.slice(0, 80);
}

export function nextConversationTitle(
  currentTitle: string | undefined,
  userText: string,
): string | null {
  const next = conversationTitleFromUserText(userText);
  if (!next) return null;
  const current = (currentTitle ?? '').trim();
  if (current && current !== 'Nueva conversación' && !isSamiGreeting(current)) {
    return null;
  }
  return next;
}
