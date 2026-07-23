"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearBoardDisplayToken,
  getBoardDisplayToken,
} from "@/lib/board-display-storage";
import { useBoardRealtime } from "../realtime/useBoardRealtime";
import {
  announceNewReadyTickets,
  playBoardVoiceSelfTest,
  unlockBoardAudio,
} from "../lib/board-speech";
import type { BoardSnapshot } from "../lib/board.types";
import { BoardTicketCard } from "./BoardTicketCard";

export default function BoardMonitor() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    const t = getBoardDisplayToken();
    if (!t) {
      router.replace("/setup");
      return;
    }
    setToken(t);
  }, [router]);

  const onSnapshot = useCallback(
    (next: BoardSnapshot, prev: BoardSnapshot) => {
      if (!token) return;
      const prevIds = new Set(prev.ready.map((t) => t.fireId));
      const newlyReady = next.ready.filter((t) => !prevIds.has(t.fireId));
      if (newlyReady.length > 0) {
        setHighlightIds((curr) => {
          const n = new Set(curr);
          for (const t of newlyReady) n.add(t.fireId);
          return n;
        });
        if (audioUnlocked) {
          announceNewReadyTickets(next.ready, prev.ready, token);
        }
        window.setTimeout(() => {
          setHighlightIds((curr) => {
            const n = new Set(curr);
            for (const t of newlyReady) n.delete(t.fireId);
            return n;
          });
        }, 8000);
      }
    },
    [audioUnlocked, token],
  );

  const { snapshot, connected, error } = useBoardRealtime(token, {
    enabled: Boolean(token),
    onSnapshot,
  });

  const unlockAudio = useCallback(() => {
    setAudioUnlocked(true);
    void unlockBoardAudio();
  }, []);

  const runVoiceTest = useCallback(async () => {
    if (!token || voiceBusy) return;
    unlockAudio();
    setVoiceBusy(true);
    setVoiceStatus("Probando voz…");
    const res = await playBoardVoiceSelfTest(token);
    setVoiceBusy(false);
    if (res.ok) {
      setVoiceStatus(
        res.mode === "lira"
          ? "Voz OK (Lira / Catalina)"
          : "Voz OK (navegador)",
      );
    } else {
      setVoiceStatus(`Voz falló: ${res.error ?? "sin audio"}`);
    }
  }, [token, unlockAudio, voiceBusy]);

  const unpair = useCallback(() => {
    clearBoardDisplayToken();
    router.replace("/setup");
  }, [router]);

  const clock = useMemo(() => {
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(snapshot.updatedAt || Date.now()));
  }, [snapshot.updatedAt]);

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background text-muted-foreground">
        Configurando…
      </main>
    );
  }

  return (
    <main
      className="flex min-h-dvh flex-1 flex-col gap-4 bg-background/80 p-4 md:p-6"
      data-test-id="kai-board-monitor"
      onClick={unlockAudio}
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Kai Board
          </h1>
          <p className="text-sm text-muted-foreground">
            <span
              className={
                connected ? "text-emerald-400" : "text-amber-300"
              }
            >
              {connected ? "En vivo" : "Reconectando…"}
            </span>
            {" · "}
            {clock}
            {error ? ` · ${error}` : ""}
            {voiceStatus ? ` · ${voiceStatus}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-sky-300/40 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/30 disabled:opacity-50"
            disabled={voiceBusy}
            onClick={(e) => {
              e.stopPropagation();
              void runVoiceTest();
            }}
            data-test-id="board-test-voice"
            title="Reproduce una frase de prueba"
          >
            {voiceBusy
              ? "Hablando…"
              : audioUnlocked
                ? "Probar voz"
                : "Activar y probar voz"}
          </button>
          {confirmUnpair ? (
            <div
              className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-950/70 px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="px-2 text-sm text-red-100">¿Salir?</span>
              <button
                type="button"
                className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-400"
                onClick={unpair}
                data-test-id="board-unpair-confirm"
              >
                Sí, desvincular
              </button>
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                onClick={() => setConfirmUnpair(false)}
                data-test-id="board-unpair-cancel"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-foreground hover:border-red-300/50 hover:bg-red-500/20 hover:text-red-100"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmUnpair(true);
              }}
              data-test-id="board-unpair"
              title="Desvincular este monitor"
            >
              Desvincular
            </button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <section
          className="flex min-h-0 flex-col rounded-3xl border border-sky-400/20 bg-sky-950/40 p-4 md:p-6"
          data-test-id="board-column-preparing"
        >
          <h2 className="mb-4 text-center text-xl font-semibold uppercase tracking-wide text-sky-200 md:text-2xl">
            En preparación
          </h2>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto lg:grid-cols-3">
            {snapshot.preparing.length === 0 ? (
              <p className="col-span-full self-center text-center text-muted-foreground">
                Sin pedidos en cocina
              </p>
            ) : (
              snapshot.preparing.map((t) => (
                <BoardTicketCard key={t.fireId} ticket={t} />
              ))
            )}
          </div>
        </section>

        <section
          className="flex min-h-0 flex-col rounded-3xl border border-emerald-400/25 bg-emerald-950/35 p-4 md:p-6"
          data-test-id="board-column-ready"
        >
          <h2 className="mb-4 text-center text-xl font-semibold uppercase tracking-wide text-emerald-200 md:text-2xl">
            Listos para retirar
          </h2>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto lg:grid-cols-3">
            {snapshot.ready.length === 0 ? (
              <p className="col-span-full self-center text-center text-muted-foreground">
                Esperando pedidos listos
              </p>
            ) : (
              snapshot.ready.map((t) => (
                <BoardTicketCard
                  key={t.fireId}
                  ticket={t}
                  emphasis={highlightIds.has(t.fireId)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
