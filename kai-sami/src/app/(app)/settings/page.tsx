"use client";

import { useEffect, useState } from "react";
import { Button, TextField } from "@kai/ui";
import {
  addFavoriteAction,
  addScheduledReportAction,
  listFavoritesAction,
  listScheduledReportsAction,
  removeFavoriteAction,
} from "@/features/assistant/actions/assistant.action";

export default function SettingsPage() {
  const [favorites, setFavorites] = useState<Array<{ id: string; title: string; prompt: string }>>(
    [],
  );
  const [scheduled, setScheduled] = useState<
    Array<{ id: string; title: string; prompt: string; cronExpr: string; isActive: boolean }>
  >([]);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const reload = async () => {
    const [f, s] = await Promise.all([listFavoritesAction(), listScheduledReportsAction()]);
    if (f.success) setFavorites(f.favorites);
    if (s.success) setScheduled(s.items);
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="space-y-8 px-4 pb-10">
      <section className="space-y-3">
        <h1 className="text-lg font-semibold">Favoritos</h1>
        <p className="text-sm text-muted-foreground">Plantillas de preguntas frecuentes.</p>
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim() || !prompt.trim()) return;
            await addFavoriteAction(title.trim(), prompt.trim());
            setTitle("");
            setPrompt("");
            await reload();
          }}
        >
          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="Pregunta"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit">Guardar favorito</Button>
        </form>
        <ul className="space-y-2">
          {favorites.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              <a className="text-sm text-primary" href={`/chat?q=${encodeURIComponent(f.prompt)}`}>
                {f.title}
              </a>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await removeFavoriteAction(f.id);
                  await reload();
                }}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Informes programados</h2>
        <p className="text-sm text-muted-foreground">
          Se guardan en el servidor. La cola de envío (inbox Kai) queda pendiente.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            if (!title.trim() || !prompt.trim()) {
              setNote("Usá título y pregunta del formulario de favoritos.");
              return;
            }
            await addScheduledReportAction(title.trim(), prompt.trim());
            setNote("Guardado. La ejecución automática aún no está activa.");
            await reload();
          }}
        >
          Programar con la pregunta actual
        </Button>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        <ul className="space-y-2">
          {scheduled.map((s) => (
            <li key={s.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.cronExpr}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
