import { getClientBackendApiBase } from "@/lib/backend-api";
import type { BoardTicket } from "./board.types";

const spokenKeys = new Set<string>();

export function boardReadySpeechKey(ticket: BoardTicket): string {
  return `${ticket.fireId}:READY`;
}

export function buildReadyAnnouncement(ticket: BoardTicket): string {
  const n =
    ticket.kitchenFireNumber != null
      ? String(ticket.kitchenFireNumber)
      : "—";
  const name = ticket.customerName.trim() || "cliente";
  return `El pedido número ${n} de ${name} está listo para retirar`;
}

export function resetSpokenReadyKeys(): void {
  spokenKeys.clear();
}

function markSpoken(key: string): boolean {
  if (spokenKeys.has(key)) return false;
  spokenKeys.add(key);
  return true;
}

/** Desbloquea AudioContext con gesto de usuario (requerido en muchas TVs). */
export async function unlockBoardAudio(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      void ctx.close();
    }
  } catch {
    /* ignore */
  }
  try {
    window.speechSynthesis?.resume();
  } catch {
    /* ignore */
  }
}

function playHtmlAudio(src: string, revokeBlob = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    let settled = false;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (revokeBlob) URL.revokeObjectURL(src);
      if (err) reject(err);
      else resolve();
    };
    audio.onended = () => done();
    audio.onerror = () => done(new Error("audio_error"));
    audio.src = src;
    void audio.play().catch((e) =>
      done(e instanceof Error ? e : new Error("play_rejected")),
    );
  });
}

async function speakViaLira(
  text: string,
  displayToken: string,
): Promise<"lira" | "browser-fallback" | "failed"> {
  const base = getClientBackendApiBase();
  try {
    const res = await fetch(`${base}/api/lira/voice/speak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Board-Display-Token": displayToken,
      },
      body: JSON.stringify({ text, voice: "es-CL-CatalinaNeural" }),
    });
    if (!res.ok) {
      console.warn("[board-tts] speak HTTP", res.status, base);
      return "failed";
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("audio") || contentType.includes("octet-stream")) {
      const raw = await res.arrayBuffer();
      if (raw.byteLength < 64) {
        console.warn("[board-tts] audio vacío", raw.byteLength);
        return "failed";
      }
      const mime = contentType.split(";")[0]?.trim() || "audio/mpeg";
      const blob = new Blob([raw], { type: mime });
      const url = URL.createObjectURL(blob);
      try {
        await playHtmlAudio(url, true);
      } catch (e) {
        console.warn("[board-tts] play failed", mime, e);
        return "failed";
      }
      return "lira";
    }
    const data = (await res.json().catch(() => null)) as {
      audioUrl?: string;
      audioBase64?: string;
      fallback?: string;
    } | null;
    if (data?.audioUrl) {
      await playHtmlAudio(data.audioUrl, false);
      return "lira";
    }
    if (data?.fallback === "browser") return "browser-fallback";
    return "failed";
  } catch (e) {
    console.warn("[board-tts] speak fetch failed", base, e);
    return "failed";
  }
}

function speakViaBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("speechSynthesis_unavailable"));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-CL";
    utter.rate = 1;
    utter.onend = () => resolve();
    utter.onerror = (ev) =>
      reject(new Error(ev.error || "speechSynthesis_error"));
    window.speechSynthesis.speak(utter);
  });
}

let queue: Promise<void> = Promise.resolve();

async function speakText(text: string, displayToken: string): Promise<void> {
  const mode = await speakViaLira(text, displayToken);
  if (mode === "lira") return;
  await speakViaBrowser(text);
}

export function enqueueReadyAnnouncement(
  ticket: BoardTicket,
  displayToken: string,
): void {
  const key = boardReadySpeechKey(ticket);
  if (!markSpoken(key)) return;
  const text = buildReadyAnnouncement(ticket);
  queue = queue
    .then(async () => {
      await speakText(text, displayToken);
    })
    .catch((e) => {
      console.warn("[board-tts] announce failed", e);
    });
}

export function announceNewReadyTickets(
  nextReady: BoardTicket[],
  prevReady: BoardTicket[],
  displayToken: string,
): void {
  const prevIds = new Set(prevReady.map((t) => t.fireId));
  for (const ticket of nextReady) {
    if (!prevIds.has(ticket.fireId)) {
      enqueueReadyAnnouncement(ticket, displayToken);
    }
  }
}

/** Autoprueba inmediata (botón Activar / Probar voz). */
export async function playBoardVoiceSelfTest(
  displayToken: string,
): Promise<{ ok: boolean; mode: "lira" | "browser"; error?: string }> {
  const text =
    "Kai Board. Prueba de voz. El pedido número 12 está listo para retirar.";
  try {
    await unlockBoardAudio();
    const mode = await speakViaLira(text, displayToken);
    if (mode === "lira") return { ok: true, mode: "lira" };
    if (mode === "failed") {
      return { ok: false, mode: "browser", error: "tts_backend_failed" };
    }
    await speakViaBrowser(text);
    return { ok: true, mode: "browser" };
  } catch (e) {
    return {
      ok: false,
      mode: "browser",
      error: e instanceof Error ? e.message : "tts_failed",
    };
  }
}
