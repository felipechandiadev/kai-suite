let lastHtmlAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  if (lastHtmlAudio) {
    lastHtmlAudio.pause();
    lastHtmlAudio.src = "";
    lastHtmlAudio = null;
  }
}

export async function speakWithBrowser(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 800));
  u.lang = "es-CL";
  window.speechSynthesis.speak(u);
}

export function playAudioBase64(audioBase64: string, contentType: string): void {
  stopSpeaking();
  const src = `data:${contentType};base64,${audioBase64}`;
  lastHtmlAudio = new Audio(src);
  void lastHtmlAudio.play();
}

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function createBrowserStt(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (
    window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    }
  ).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "es-CL";
  rec.interimResults = false;
  return rec;
}
