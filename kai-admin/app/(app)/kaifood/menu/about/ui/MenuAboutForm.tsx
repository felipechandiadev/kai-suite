"use client";

import { useState, useTransition } from "react";
import { Button, TextField } from "@kai/ui";
import { saveMenuAboutAction } from "@/features/kai-menu/actions/kai-menu.action";

type Props = {
  companyId: string;
  initial: { title: string; body: string };
};

export function MenuAboutForm({ companyId, initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto max-w-2xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const ok = await saveMenuAboutAction(companyId, { title, body });
          setMessage(ok ? "Guardado." : "No se pudo guardar.");
        });
      }}
    >
      <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="block text-sm font-medium">
        Texto
        <textarea
          className="mt-1 min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
