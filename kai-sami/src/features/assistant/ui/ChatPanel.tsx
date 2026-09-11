"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, Switch } from "@kai/ui";
import type { ChatTurn } from "../domain/assistant-block.types";
import {
  sendAssistantFeedbackAction,
  sendAssistantMessageAction,
  speakAssistantTextAction,
} from "../actions/assistant.action";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { playAudioBase64, speakWithBrowser, stopSpeaking } from "../lib/sami-speech";
import { readVoiceMode, writeVoiceMode } from "../lib/sami-voice-mode";
import { AssistantBlocks } from "./blocks/AssistantBlocks";
import { ChatComposer } from "./ChatComposer";

async function speakReply(text: string): Promise<void> {
  try {
    const res = await speakAssistantTextAction(text.slice(0, 800));
    if (!res.success) {
      handleUnauthorizedClient(res);
      await speakWithBrowser(text);
      return;
    }
    if ("fallback" in res && res.fallback === "browser") {
      await speakWithBrowser(text);
      return;
    }
    if ("audioBase64" in res) {
      playAudioBase64(res.audioBase64, res.contentType);
    }
  } catch {
    await speakWithBrowser(text);
  }
}

export function ChatPanel({
  initialConversationId,
  initialTurns = [],
}: {
  initialConversationId?: string | null;
  initialTurns?: ChatTurn[];
}) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = readVoiceMode();
    setVoiceMode(on);
    voiceModeRef.current = on;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  const onVoiceModeChange = (on: boolean) => {
    setVoiceMode(on);
    voiceModeRef.current = on;
    writeVoiceMode(on);
    if (!on) stopSpeaking();
  };

  const onSend = async (text: string) => {
    setError(null);
    setTurns((t) => [
      ...t,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setBusy(true);
    try {
      const res = await sendAssistantMessageAction(text, conversationId);
      if (!res.success) {
        handleUnauthorizedClient(res);
        setError(res.error);
        return;
      }
      setConversationId(res.conversationId);
      setTurns((t) => [
        ...t,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.assistantMessage.content,
          blocks: res.assistantMessage.blocks,
          lastAuditId: res.assistantMessage.meta.lastAuditId,
        },
      ]);
      if (voiceModeRef.current) {
        await speakReply(res.assistantMessage.content);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <Switch
          checked={voiceMode}
          onChange={onVoiceModeChange}
          label="Modo voz"
          labelPosition="left"
          density="compact"
        />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Preguntá por ventas, inventario o sucursales. Ejemplo: «¿cuánto vendimos esta
            semana?»
          </p>
        ) : null}
        {turns.map((turn) =>
          turn.role === "user" ? (
            <article key={turn.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                {turn.content}
              </p>
            </article>
          ) : (
            <article key={turn.id} className="space-y-2">
              <div className="flex items-center justify-end gap-1">
                {turn.lastAuditId ? <FeedbackButtons auditId={turn.lastAuditId} /> : null}
                {voiceMode ? <SpeakButton text={turn.content} /> : null}
              </div>
              <AssistantBlocks
                blocks={turn.blocks ?? [{ type: "markdown", content: turn.content }]}
              />
            </article>
          ),
        )}
        {busy ? <p className="text-sm text-muted-foreground">Consultando…</p> : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <div ref={bottomRef} />
      </div>
      <ChatComposer disabled={busy} voiceMode={voiceMode} onSend={(t) => void onSend(t)} />
    </div>
  );
}

function FeedbackButtons({ auditId }: { auditId: string }) {
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return <span className="text-xs text-muted-foreground">Gracias</span>;
  }
  return (
    <>
      <IconButton
        icon="ThumbsUp"
        variant="action"
        size="sm"
        ariaLabel="Útil"
        onClick={async () => {
          await sendAssistantFeedbackAction(auditId, "useful");
          setDone("useful");
        }}
      />
      <IconButton
        icon="ThumbsDown"
        variant="action"
        size="sm"
        ariaLabel="No útil"
        onClick={async () => {
          await sendAssistantFeedbackAction(auditId, "not_useful");
          setDone("not_useful");
        }}
      />
    </>
  );
}

function SpeakButton({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <IconButton
      icon="Volume2"
      variant="action"
      size="sm"
      ariaLabel="Escuchar"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await speakReply(text);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
