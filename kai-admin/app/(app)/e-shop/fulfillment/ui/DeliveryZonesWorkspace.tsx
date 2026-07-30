"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog } from "@kai/ui";
import { saveDeliveryZoneAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { communeSlug } from "@/features/e-shop-delivery/lib/commune-slug";
import type {
  DeliveryCommuneRow,
  DeliveryZoneRow,
  GeoJsonPolygon,
  MauleCommunesFeatureCollection,
} from "@/features/e-shop-delivery/types/delivery.types";
import {
  DeliveryZoneEditorPanel,
  type ZoneEditorDraft,
} from "./DeliveryZoneEditorPanel";
import { DeliveryZonesList } from "./DeliveryZonesList";
import type { DeliveryZonesMapHandle } from "./DeliveryZonesMap";
import { DeliveryZonesMapWrapper } from "./DeliveryZonesMapWrapper";

type DeliveryZonesWorkspaceProps = {
  initialZones: DeliveryZoneRow[];
  communes: DeliveryCommuneRow[];
};

type PendingDiscardAction =
  | { type: "new" }
  | { type: "select"; zone: DeliveryZoneRow }
  | { type: "cancel" };

const EMPTY_DRAFT: ZoneEditorDraft = {
  name: "",
  shippingFee: 2500,
  isActive: true,
};

export function DeliveryZonesWorkspace({
  initialZones,
  communes,
}: DeliveryZonesWorkspaceProps) {
  const router = useRouter();
  const mapRef = useRef<DeliveryZonesMapHandle>(null);

  const [zones, setZones] = useState(initialZones);
  const [zonesSource, setZonesSource] = useState(initialZones);
  if (initialZones !== zonesSource) {
    setZonesSource(initialZones);
    setZones(initialZones);
  }

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ZoneEditorDraft>(EMPTY_DRAFT);
  const [draftGeometry, setDraftGeometry] = useState<GeoJsonPolygon | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingDiscardAction, setPendingDiscardAction] =
    useState<PendingDiscardAction | null>(null);
  const [geojson, setGeojson] = useState<MauleCommunesFeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/geo/maule-communes.geojson")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MauleCommunesFeatureCollection>;
      })
      .then((data) => {
        if (!cancelled) setGeojson(data);
      })
      .catch(() => {
        if (!cancelled) setGeojson(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCodes = useMemo(
    () => new Set(communes.filter((c) => c.isEnabled).map((c) => c.code)),
    [communes],
  );

  const operationalGeoJson = useMemo(() => {
    if (!geojson || enabledCodes.size === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: geojson.features.filter((f) =>
        enabledCodes.has(communeSlug(f.properties.Comuna)),
      ),
    };
  }, [geojson, enabledCodes]);

  const applyResetEditor = useCallback(() => {
    setSelectedZoneId(null);
    setIsNew(false);
    setEditorOpen(false);
    setDraft(EMPTY_DRAFT);
    setDraftGeometry(null);
    setIsDirty(false);
    setError(null);
    mapRef.current?.clearEdit();
  }, []);

  const applyStartNewZone = useCallback(() => {
    setSelectedZoneId(null);
    setIsNew(true);
    setEditorOpen(true);
    setDraft({ ...EMPTY_DRAFT });
    setDraftGeometry(null);
    setIsDirty(true);
    setError(null);
    mapRef.current?.startNewZone();
  }, []);

  const applySelectZone = useCallback((zone: DeliveryZoneRow) => {
    setSelectedZoneId(zone.id);
    setIsNew(false);
    setEditorOpen(true);
    setDraft({
      name: zone.name,
      shippingFee: Number(zone.shippingFee) || 0,
      isActive: zone.isActive,
    });
    setError(null);
    setIsDirty(false);
    if (zone.geometry) {
      setDraftGeometry(zone.geometry);
      mapRef.current?.loadZone(zone.geometry);
    } else {
      setDraftGeometry(null);
      mapRef.current?.clearEdit();
    }
  }, []);

  const requestDiscardIfDirty = useCallback(
    (action: PendingDiscardAction) => {
      if (!isDirty) {
        switch (action.type) {
          case "new":
            applyStartNewZone();
            break;
          case "select":
            applySelectZone(action.zone);
            break;
          case "cancel":
            applyResetEditor();
            break;
        }
        return;
      }
      setPendingDiscardAction(action);
      setDiscardDialogOpen(true);
    },
    [applyResetEditor, applySelectZone, applyStartNewZone, isDirty],
  );

  const handleConfirmDiscard = () => {
    const action = pendingDiscardAction;
    setDiscardDialogOpen(false);
    setPendingDiscardAction(null);
    if (!action) return;
    switch (action.type) {
      case "new":
        applyStartNewZone();
        break;
      case "select":
        applySelectZone(action.zone);
        break;
      case "cancel":
        applyResetEditor();
        break;
    }
  };

  const handleGeometryChange = (geometry: GeoJsonPolygon | null) => {
    setDraftGeometry(geometry);
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Leer del mapa: los vértices editados con el lápiz pueden no estar en draft
    // hasta confirmar con ✓ en leaflet-draw.
    const geometryFromMap = mapRef.current?.getDraftGeometry() ?? null;
    const geometry = geometryFromMap ?? draftGeometry;
    if (!geometry) {
      setError("El polígono es obligatorio.");
      return;
    }
    setDraftGeometry(geometry);
    setSaving(true);
    setError(null);
    try {
      const result = await saveDeliveryZoneAction({
        id: isNew ? undefined : (selectedZoneId ?? undefined),
        name: draft.name.trim(),
        shippingFee: draft.shippingFee,
        isActive: draft.isActive,
        geometry,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const saved = result.zone as DeliveryZoneRow;
      setZones((prev) => {
        const exists = prev.some((z) => z.id === saved.id);
        if (exists) {
          return prev.map((z) => (z.id === saved.id ? saved : z));
        }
        return [...prev, saved].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
      });
      setSelectedZoneId(saved.id);
      setIsNew(false);
      setIsDirty(false);
      setEditorOpen(true);
      setDraft({
        name: saved.name,
        shippingFee: Number(saved.shippingFee) || 0,
        isActive: saved.isActive,
      });
      if (saved.geometry) {
        setDraftGeometry(saved.geometry);
        mapRef.current?.loadZone(saved.geometry);
      }
      await router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4" data-test-id="delivery-zones-workspace">
        {enabledCodes.size === 0 ? (
          <Alert variant="warning">
            Configura primero las comunas habilitadas en{" "}
            <Link href="/reparto/cobertura" className="font-medium underline">
              Cobertura
            </Link>{" "}
            antes de definir zonas de reparto.
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => requestDiscardIfDirty({ type: "new" })}
            disabled={saving}
            data-test-id="delivery-zone-add"
          >
            Nueva zona
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-stretch">
          <aside className="flex h-[52vh] max-h-128 min-h-80 flex-col rounded-xl border border-border p-3">
            <DeliveryZonesList
              items={zones}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zone) => requestDiscardIfDirty({ type: "select", zone })}
            />
          </aside>

          <div className="min-w-0">
            <div className="h-[52vh] max-h-128 min-h-80">
              <DeliveryZonesMapWrapper
                ref={mapRef}
                zones={zones}
                selectedZoneId={selectedZoneId}
                operationalGeoJson={operationalGeoJson}
                onDraftGeometryChange={handleGeometryChange}
              />
            </div>
            <DeliveryZoneEditorPanel
              key={isNew ? "new" : (selectedZoneId ?? "closed")}
              open={editorOpen}
              isNew={isNew}
              draft={draft}
              geometry={draftGeometry}
              saving={saving}
              error={error}
              onDraftChange={(next) => {
                setDraft(next);
                setIsDirty(true);
              }}
              onSave={() => void handleSave()}
              onCancel={() => requestDiscardIfDirty({ type: "cancel" })}
            />
          </div>
        </div>
      </div>

      <Dialog
        open={discardDialogOpen}
        onClose={() => {
          setDiscardDialogOpen(false);
          setPendingDiscardAction(null);
        }}
        title="Cambios sin guardar"
        size="sm"
        showCloseButton={false}
        data-test-id="delivery-zone-discard-dialog"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDiscardDialogOpen(false);
                setPendingDiscardAction(null);
              }}
            >
              Seguir editando
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirmDiscard}>
              Descartar cambios
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Hay cambios sin guardar en esta zona. Si continúas, se perderán.
        </p>
      </Dialog>
    </>
  );
}
