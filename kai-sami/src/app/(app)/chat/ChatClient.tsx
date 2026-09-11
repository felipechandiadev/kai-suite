"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChatPanel } from "@/features/assistant/ui/ChatPanel";
import { getConversationAction } from "@/features/assistant/actions/assistant.action";
import type { ChatTurn } from "@/features/assistant/domain/assistant-block.types";

function ChatWithQuery() {
  const sp = useSearchParams();
  const c = sp.get("c");
  const q = sp.get("q");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [ready, setReady] = useState(!c);

  useEffect(() => {
    if (!c) return;
    void (async () => {
      const res = await getConversationAction(c);
      if (res.success) {
        setTurns(
          res.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            blocks: m.blocks,
          })),
        );
      }
      setReady(true);
    })();
  }, [c]);

  if (!ready) return <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>;
  return (
    <ChatPanel
      initialConversationId={c}
      initialTurns={
        q && turns.length === 0
          ? [{ id: "seed", role: "user", content: q }]
          : turns
      }
    />
  );
}

export default function ChatClientGate() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm">Cargando…</p>}>
      <ChatWithQuery />
    </Suspense>
  );
}
