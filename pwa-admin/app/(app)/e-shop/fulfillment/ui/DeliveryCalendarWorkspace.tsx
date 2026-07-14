"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDaysIso,
  adminFillViewportBelowTopBarClassName,
  Button,
  Calendar,
  Dialog,
  getTodayIso,
  getWeekStart,
  type CalendarEvent,
} from "@kai/ui";
import {
  cancelDeliveryOccurrenceAction,
  saveDeliveryOccurrenceAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import type {
  DeliveryOccurrenceRow,
  DeliveryZoneRow,
} from "@/features/e-shop-delivery/types/delivery.types";
import { CancelDeliveryOccurrenceDialog } from "./CancelDeliveryOccurrenceDialog";
import { DeliveryRepartoCard } from "./DeliveryRepartoCard";
import {
  defaultRepartoDraft,
  DeliveryRepartoEditorDialog,
  occurrenceToDraft,
  type RepartoEditorDraft,
} from "./DeliveryRepartoEditorDialog";

type DeliveryCalendarWorkspaceProps = {
  initialOccurrences: DeliveryOccurrenceRow[];
  zones: DeliveryZoneRow[];
  initialWeekStart: string;
};

type EditorState =
  | { mode: "closed" }
  | { mode: "create"; draft: RepartoEditorDraft }
  | { mode: "edit"; id: string; draft: RepartoEditorDraft; canCancel: boolean };

function normalizeOccurrence(row: DeliveryOccurrenceRow): DeliveryOccurrenceRow {
  return {
    ...row,
    zoneIds: row.zoneIds ?? row.zones?.map((z) => z.id) ?? [],
    zones: row.zones ?? [],
    orderCount: row.orderCount ?? 0,
    availableSlots: row.availableSlots ?? null,
    canEdit: row.canEdit ?? !row.isCancelled,
    canCancel: row.canCancel ?? !row.isCancelled,
  };
}

export function DeliveryCalendarWorkspace({
  initialOccurrences,
  zones,
  initialWeekStart,
}: DeliveryCalendarWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const todayIso = getTodayIso();

  const weekStart = searchParams.get("week") ?? initialWeekStart;
  const [occurrencesSource, setOccurrencesSource] = useState(initialOccurrences);
  const [occurrences, setOccurrences] = useState(() =>
    initialOccurrences.map(normalizeOccurrence),
  );
  if (initialOccurrences !== occurrencesSource) {
    setOccurrencesSource(initialOccurrences);
    setOccurrences(initialOccurrences.map(normalizeOccurrence));
  }

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<EditorState | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const zoneIndexById = useMemo(() => {
    const map = new Map<string, number>();
    zones.forEach((z, i) => map.set(z.id, i));
    return map;
  }, [zones]);

  const navigateWeek = useCallback(
    (start: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", start);
      router.push(`/e-shop/fulfillment/calendario?${params.toString()}`);
    },
    [router, searchParams],
  );

  const requestEditor = (next: EditorState) => {
    if (isDirty && editor.mode !== "closed") {
      setPendingEditor(next);
      setDiscardOpen(true);
      return;
    }
    setEditor(next);
    setIsDirty(next.mode !== "closed");
    setError(null);
  };

  const handleConfirmDiscard = () => {
    setDiscardOpen(false);
    const next = pendingEditor;
    setPendingEditor(null);
    if (!next || next.mode === "closed") {
      setEditor({ mode: "closed" });
      setIsDirty(false);
      setError(null);
      return;
    }
    setEditor(next);
    setIsDirty(true);
    setError(null);
  };

  const handleNewReparto = (date?: string, hour?: number) => {
    const departureTime =
      hour != null ? `${String(hour).padStart(2, "0")}:00` : "09:00";
    requestEditor({
      mode: "create",
      draft: defaultRepartoDraft(date ?? todayIso, departureTime),
    });
  };

  const handleEdit = (occurrence: DeliveryOccurrenceRow) => {
    if (!occurrence.canEdit) return;
    requestEditor({
      mode: "edit",
      id: occurrence.id,
      draft: occurrenceToDraft(occurrence),
      canCancel: occurrence.canCancel,
    });
  };

  const updateDraft = (draft: RepartoEditorDraft) => {
    if (editor.mode === "closed") return;
    setEditor({ ...editor, draft });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (editor.mode === "closed") return;
    setSaving(true);
    setError(null);
    const { draft } = editor;
    const maxOrdersRaw = draft.maxOrders.trim();
    const maxOrders =
      maxOrdersRaw === "" ? null : Number.parseInt(maxOrdersRaw, 10);
    try {
      const result = await saveDeliveryOccurrenceAction({
        id: editor.mode === "edit" ? editor.id : undefined,
        name: draft.name.trim(),
        occurrenceDate: draft.occurrenceDate,
        departureTime: draft.departureTime,
        orderCutoffTime: draft.orderCutoffTime,
        zoneIds: draft.zoneIds,
        maxOrders: Number.isFinite(maxOrders as number) ? maxOrders : null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const saved = normalizeOccurrence(result.row);
      setOccurrences((prev) => {
        const exists = prev.some((r) => r.id === saved.id);
        if (exists) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [...prev, saved].sort(
          (a, b) =>
            a.occurrenceDate.localeCompare(b.occurrenceDate) ||
            a.departureTime.localeCompare(b.departureTime),
        );
      });
      setEditor({ mode: "closed" });
      setIsDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (editor.mode !== "edit") return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      const result = await cancelDeliveryOccurrenceAction(editor.id);
      if (!result.success) {
        setCancelError(result.error);
        return;
      }
      const saved = normalizeOccurrence(result.row);
      setOccurrences((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setCancelOpen(false);
      setEditor({ mode: "closed" });
      setIsDirty(false);
      router.refresh();
    } finally {
      setCancelBusy(false);
    }
  };

  const events: CalendarEvent[] = useMemo(
    () =>
      occurrences
        .filter((o) => o.occurrenceDate >= weekStart && o.occurrenceDate <= addDaysIso(weekStart, 6))
        .map((occurrence) => ({
          id: occurrence.id,
          date: occurrence.occurrenceDate,
          startTime: occurrence.departureTime,
          content: (
            <div
              role="button"
              tabIndex={0}
              className="block w-full cursor-pointer text-left"
              onClick={() => handleEdit(occurrence)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleEdit(occurrence);
                }
              }}
            >
              <DeliveryRepartoCard
                occurrence={occurrence}
                zoneIndexById={zoneIndexById}
                onEdit={handleEdit}
              />
            </div>
          ),
        })),
    // handleEdit depends on editor/isDirty; events rebuild on occurrences/week/zones is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occurrences, weekStart, zoneIndexById],
  );

  const editorOpen = editor.mode !== "closed";
  const editorDraft =
    editor.mode !== "closed" ? editor.draft : defaultRepartoDraft(todayIso);
  const editorIsNew = editor.mode === "create";
  const canCancelOccurrence = editor.mode === "edit" && editor.canCancel;
  const editingName =
    editor.mode === "edit" ? editor.draft.name || "este reparto" : "";

  return (
    <div className={`flex flex-col gap-4 ${adminFillViewportBelowTopBarClassName}`}>
      <Calendar
        view="week"
        referenceDate={weekStart}
        events={events}
        columnsFrom="always"
        emptySlotLabel="Programar reparto"
        headerRight={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleNewReparto(todayIso)}
            disabled={saving}
          >
            Nuevo reparto
          </Button>
        }
        onNavigate={navigateWeek}
        onSelectDate={(iso) => handleNewReparto(iso)}
        onSelectSlot={(iso, hour) => handleNewReparto(iso, hour)}
      />

      <DeliveryRepartoEditorDialog
        open={editorOpen}
        isNew={editorIsNew}
        draft={editorDraft}
        zones={zones}
        saving={saving}
        error={error}
        onDraftChange={updateDraft}
        onSave={() => {
          void handleSave();
        }}
        onCancel={() => requestEditor({ mode: "closed" })}
        canCancelOccurrence={canCancelOccurrence}
        onRequestCancelOccurrence={() => {
          setCancelError(null);
          setCancelOpen(true);
        }}
      />

      <CancelDeliveryOccurrenceDialog
        open={cancelOpen}
        occurrenceName={editingName}
        busy={cancelBusy}
        error={cancelError}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          void handleConfirmCancel();
        }}
      />

      <Dialog
        open={discardOpen}
        onClose={() => {
          setDiscardOpen(false);
          setPendingEditor(null);
        }}
        title="Descartar cambios"
        size="sm"
        actionsJustify="end"
        actions={
          <>
            <Button
              type="button"
              variant="outlinedSecondary"
              onClick={() => {
                setDiscardOpen(false);
                setPendingEditor(null);
              }}
            >
              Seguir editando
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDiscard}>
              Descartar
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Hay cambios sin guardar. ¿Descartarlos y continuar?
        </p>
      </Dialog>
    </div>
  );
}
