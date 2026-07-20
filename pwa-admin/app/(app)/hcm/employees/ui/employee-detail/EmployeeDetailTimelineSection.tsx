"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, LoadingState, TextField } from "@kai/ui";
import {
  addEmployeeTimelineNoteAction,
  listEmployeeTimelineAction,
} from "@/features/hr-employees/actions/timeline.action";
import type { EmployeeTimelineEntryView } from "@/features/hr-employees/types/timeline.types";
import { TIMELINE_KIND_LABELS } from "@/features/hr-employees/types/timeline.types";
import { employeeSectionCardClass } from "./employee-section-card";
import { formatDateOnlySlash } from "./employee-detail-labels";

type Props = {
  employeeId: string;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const date = formatDateOnlySlash(d.toISOString().slice(0, 10));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${date} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export function EmployeeDetailTimelineSection({ employeeId }: Props) {
  const [entries, setEntries] = useState<EmployeeTimelineEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const load = () => {
    const id = employeeId.trim();
    if (!id) return;
    setLoading(true);
    void listEmployeeTimelineAction(id).then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setError(null);
      setEntries(res.data);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" />;
  }

  return (
    <section
      className={employeeSectionCardClass(false)}
      data-test-id="employee-detail-timeline"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Historial</h2>
        <p className="text-xs text-muted-foreground">
          Anotaciones y eventos relevantes del funcionario.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="space-y-2">
        <TextField
          label="Nueva anotación"
          type="textarea"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={pending || !note.trim()}
          onClick={() => {
            startTransition(async () => {
              const res = await addEmployeeTimelineNoteAction(
                employeeId,
                note.trim(),
              );
              if (!res.success) {
                setError(res.message);
                return;
              }
              setNote("");
              load();
            });
          }}
        >
          Agregar anotación
        </Button>
      </div>

      <ul className="mt-4 space-y-3 border-t border-border pt-3">
        {entries.length === 0 ? (
          <li className="text-sm text-muted-foreground">Sin eventos aún.</li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className="text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-foreground">{e.title}</span>
                <span className="text-xs text-muted-foreground">
                  {TIMELINE_KIND_LABELS[e.kind] ?? e.kind} ·{" "}
                  {formatWhen(e.occurredAt)}
                </span>
              </div>
              {e.body ? (
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {e.body}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
