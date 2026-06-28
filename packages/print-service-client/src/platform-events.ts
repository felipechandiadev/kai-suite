/** Prefijos de CustomEvent durante migración flowstore: → kai: (F6). */

export const PLATFORM_EVENT_PREFIX = "kai:";
export const PLATFORM_EVENT_LEGACY_PREFIX = "flowstore:";

export function primaryPlatformEventName(name: string): string {
  if (name.startsWith(PLATFORM_EVENT_PREFIX)) return name;
  if (name.startsWith(PLATFORM_EVENT_LEGACY_PREFIX)) {
    return PLATFORM_EVENT_PREFIX + name.slice(PLATFORM_EVENT_LEGACY_PREFIX.length);
  }
  return PLATFORM_EVENT_PREFIX + name;
}

export function legacyPlatformEventName(name: string): string {
  if (name.startsWith(PLATFORM_EVENT_LEGACY_PREFIX)) return name;
  if (name.startsWith(PLATFORM_EVENT_PREFIX)) {
    return PLATFORM_EVENT_LEGACY_PREFIX + name.slice(PLATFORM_EVENT_PREFIX.length);
  }
  return PLATFORM_EVENT_LEGACY_PREFIX + name;
}

export function dispatchDualPlatformEvent(primaryEventName: string, detail?: unknown): void {
  if (typeof window === "undefined") return;
  const primary = primaryPlatformEventName(primaryEventName);
  const legacy = legacyPlatformEventName(primary);
  const init: CustomEventInit | undefined =
    detail !== undefined ? { detail } : undefined;
  window.dispatchEvent(new CustomEvent(primary, init));
  if (legacy !== primary) {
    window.dispatchEvent(new CustomEvent(legacy, init));
  }
}

export function addDualPlatformEventListener(
  primaryEventName: string,
  handler: (event: Event) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const primary = primaryPlatformEventName(primaryEventName);
  const legacy = legacyPlatformEventName(primary);
  window.addEventListener(primary, handler);
  if (legacy !== primary) {
    window.addEventListener(legacy, handler);
  }
  return () => {
    window.removeEventListener(primary, handler);
    if (legacy !== primary) {
      window.removeEventListener(legacy, handler);
    }
  };
}

export function matchesPlatformCloseReason(
  reason: string,
  primaryReason: string,
  legacyReason?: string,
): boolean {
  const r = (reason || "").trim();
  if (!r) return false;
  if (r.includes(primaryReason)) return true;
  const legacy = legacyReason ?? legacyPlatformEventName(primaryReason);
  return legacy !== primaryReason && r.includes(legacy);
}
