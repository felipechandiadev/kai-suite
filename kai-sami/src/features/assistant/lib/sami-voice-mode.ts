const VOICE_MODE_KEY = "kai-sami-voice-mode";

export function readVoiceMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VOICE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeVoiceMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOICE_MODE_KEY, on ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}
