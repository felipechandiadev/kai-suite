"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDaysIso,
  adminFillViewportBelowTopBarClassName,
  Button,
  ButtonGroupToggle,
  Calendar,
  Dialog,
  getTodayIso,
  type CalendarEvent,
} from "@kai/ui";
import {
  cancelDeliveryOccurrenceAction,
  saveDeliveryOccurrenceAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import type {
  DeliveryOccurrenceKind,
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

type KindFilter = "ALL" | DeliveryOccurrenceKind;

type EditorState =
  | { mode: "closed" }
  | { mode: "create"; draft: RepartoEditorDraft }
  | { mode: "edit"; id: string; draft: RepartoEditorDraft; canCancel: boolean };

function normalizeOccurrence(row: DeliveryOccurrenceRow): DeliveryOccurrenceRow {
  return {
    ...row,
    kind: row.kind ?? "LOCAL_DELIVERY",
    endTime: row.endTime ?? null,
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
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
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

  const createKindForSlot = (): DeliveryOccurrenceKind => {
    if (kindFilter === "PICKUP") return "PICKUP";
    return "LOCAL_DELIVERY";
  };

  const handleNewOccurrence = (
    kind: DeliveryOccurrenceKind,
    date?: string,
    hour?: number,
  ) => {
    const departureTime =
      hour != null ? `${String(hour).padStart(2, "0")}:00` : "09:00";
    requestEditor({
      mode: "create",
      draft: defaultRepartoDraft(date ?? todayIso, departureTime, kind),
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
    const isPickup = draft.kind === "PICKUP";
    try {
      const result = await saveDeliveryOccurrenceAction({
        id: editor.mode === "edit" ? editor.id : undefined,
        kind: draft.kind,
        name: draft.name.trim(),
        occurrenceDate: draft.occurrenceDate,
        departureTime: draft.departureTime,
        endTime: isPickup ? draft.endTime : null,
        orderCutoffTime: draft.orderCutoffTime,
        zoneIds: isPickup ? [] : draft.zoneIds,
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

  const filteredOccurrences = useMemo(() => {
    if (kindFilter === "ALL") return occurrences;
    return occurrences.filter((o) => (o.kind ?? "LOCAL_DELIVERY") === kindFilter);
  }, [occurrences, kindFilter]);

  const events: CalendarEvent[] = useMemo(
    () =>
      filteredOccurrences
        .filter(
          (o) =>
            o.occurrenceDate >= weekStart &&
            o.occurrenceDate <= addDaysIso(weekStart, 6),
        )
        .map((occurrence) => ({
          id: occurrence.id,
          date: occurrence.occurrenceDate,
          startTime: occurrence.departureTime,
          endTime: occurrence.endTime ?? undefined,
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
    [filteredOccurrences, weekStart, zoneIndexById],
  );

  const editorOpen = editor.mode !== "closed";
  const editorDraft =
    editor.mode !== "closed" ? editor.draft : defaultRepartoDraft(todayIso);
  const editorIsNew = editor.mode === "create";
  const canCancelOccurrence = editor.mode === "edit" && editor.canCancel;
  const editingKind =
    editor.mode === "edit" ? editor.draft.kind : ("LOCAL_DELIVERY" as const);
  const editingName =
    editor.mode === "edit"
      ? editor.draft.name || (editingKind === "PICKUP" ? "este retiro" : "este reparto")
      : "";
  const emptySlotLabel =
    kindFilter === "PICKUP" ? "Programar retiro" : "Programar reparto";

  return (
    <div className={`flex flex-col gap-4 ${adminFillViewportBelowTopBarClassName}`}>
      <Calendar
        view="week"
        referenceDate={weekStart}
        events={events}
        columnsFrom="always"
        emptySlotLabel={emptySlotLabel}
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonGroupToggle
              aria-label="Filtrar tipo de franja"
              density="compact"
              value={kindFilter}
              onChange={(id) => setKindFilter(id as KindFilter)}
              options={[
                { id: "ALL", label: "Todos" },
                { id: "LOCAL_DELIVERY", label: "Reparto" },
                { id: "PICKUP", label: "Retiro" },
              ]}
            />
            <Button
              type="button"
              variant="outlinedSecondary"
              size="sm"
              onClick={() => handleNewOccurrence("PICKUP", todayIso)}
              disabled={saving}
            >
              Nuevo retiro
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleNewOccurrence("LOCAL_DELIVERY", todayIso)}
              disabled={saving}
            >
              Nuevo reparto
            </Button>
          </div>
        }
        onNavigate={navigateWeek}
        onSelectDate={(iso) => handleNewOccurrence(createKindForSlot(), iso)}
        onSelectSlot={(iso, hour) =>
          handleNewOccurrence(createKindForSlot(), iso, hour)
        }
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
        entityLabel={editingKind === "PICKUP" ? "retiro" : "reparto"}
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
