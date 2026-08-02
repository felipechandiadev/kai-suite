"use client";

import { useState, useTransition } from "react";
import { Button, TextField } from "@kai/ui";
import { saveMenuThemeAction } from "@/features/kai-menu/actions/kai-menu.action";

type Props = {
  companyId: string;
  initial: { templateId: string; themeTokenOverrides: Record<string, string> };
};

export function MenuAppearanceForm({ companyId, initial }: Props) {
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const ok = await saveMenuThemeAction(companyId, {
            templateId,
            themeTokenOverrides: initial.themeTokenOverrides,
          });
          setMessage(ok ? "Guardado." : "No se pudo guardar.");
        });
      }}
    >
      <TextField
        label="Plantilla"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
      />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
