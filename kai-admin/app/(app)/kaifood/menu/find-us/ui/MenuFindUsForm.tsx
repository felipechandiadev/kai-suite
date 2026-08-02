"use client";

import { useState, useTransition } from "react";
import { Button, TextField } from "@kai/ui";
import { saveMenuFindUsAction } from "@/features/kai-menu/actions/kai-menu.action";

type Props = {
  companyId: string;
  initial: {
    title: string;
    address: string;
    phone: string;
    hours: string;
  };
};

export function MenuFindUsForm({ companyId, initial }: Props) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto max-w-2xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const ok = await saveMenuFindUsAction(companyId, form);
          setMessage(ok ? "Guardado." : "No se pudo guardar.");
        });
      }}
    >
      <TextField
        label="Título"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <TextField
        label="Dirección"
        value={form.address}
        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
      />
      <TextField
        label="Teléfono"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
      />
      <TextField
        label="Horario"
        value={form.hours}
        onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
      />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
