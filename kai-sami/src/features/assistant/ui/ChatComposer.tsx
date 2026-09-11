"use client";

import { useState } from "react";
import { IconButton } from "@kai/ui";
import { createBrowserStt } from "../lib/sami-speech";

export function ChatComposer({
  disabled,
  voiceMode,
  onSend,
}: {
  disabled?: boolean;
  voiceMode: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
  };

  const startStt = () => {
    const rec = createBrowserStt();
    if (!rec) return;
    rec.onresult = (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const t = ev.results[0]?.[0]?.transcript ?? "";
      if (t) setValue((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-border bg-background p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        className="min-h-[48px] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm"
        placeholder="Preguntá a SaMI… p. ej. ¿cuánto vendimos esta semana?"
        value={value}
        disabled={disabled}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {voiceMode ? (
        <IconButton
          icon="Mic"
          variant="action"
          size="md"
          type="button"
          ariaLabel={listening ? "Escuchando" : "Dictar"}
          onClick={startStt}
          disabled={disabled}
        />
      ) : null}
      <IconButton
        icon="Send"
        variant="action"
        size="md"
        ariaLabel="Enviar"
        type="submit"
        disabled={disabled || !value.trim()}
      />
    </form>
  );
}
