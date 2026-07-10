"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Alert } from "@kai/ui";
import {
  listMultimediaForEntityAction,
  revalidateMultimediaCachesAction,
  setPrimaryMultimediaAssetAction,
  unlinkMultimediaFromEntityAction,
  reorderMultimediaAssetsAction,
} from "@/features/multimedia/actions/multimedia.action";
import { uploadMultimediaForEntityClient } from "@/features/multimedia/infrastructure/multimedia.client";
import type { MultimediaAssetListItem, MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";
import { multimediaDefaultsForEntity } from "./multimedia-field-defaults";
import { MultimediaCollectionGrid } from "./MultimediaCollectionGrid";
import { MultimediaPickTrigger } from "./MultimediaPickTrigger";
import { filterValidMultimediaFiles } from "./validate-multimedia-files";
import type {
  MultimediaFieldProps,
  MultimediaGridItem,
  MultimediaStagingItem,
} from "./types";

function newClientId(): string {
  return `stg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function filesToStagingItems(
  files: File[],
  primaryIndex: number,
): MultimediaStagingItem[] {
  return files.map((file, i) => ({
    clientId: newClientId(),
    file,
    previewUrl: URL.createObjectURL(file),
    isPrimary: i === primaryIndex,
  }));
}

function stagingItemsToFiles(items: MultimediaStagingItem[]): File[] {
  return items.map((s) => s.file);
}

function reorderArray<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function MultimediaField(props: MultimediaFieldProps) {
  const {
    mode,
    layout,
    singleVariant,
    entityType,
    entityId,
    attributeId,
    onChanged,
    value = [],
    onChange,
    stagingPrimaryIndex: controlledPrimaryIndex,
    onStagingPrimaryIndexChange,
    title,
    omitHeading = false,
    disabled = false,
    pickButton: pickButtonProp,
    accept = "image/*,video/*",
    maxFiles = 12,
    maxSizeMb = 9,
    aspectRatio = "16:9",
    allowDragDrop = true,
    allowPrimary: allowPrimaryProp,
    allowReorder: allowReorderProp,
    enableGallery: enableGalleryProp,
    stagingResetKey,
    className = "",
    "data-test-id": testId = "multimedia-field",
  } = props;

  const defaults =
    mode === "persisted" && entityType
      ? multimediaDefaultsForEntity(entityType)
      : null;

  const pickButton = pickButtonProp ?? defaults?.pickButton ?? "icon";
  const allowPrimary = allowPrimaryProp ?? defaults?.allowPrimary ?? false;
  const allowReorder = allowReorderProp ?? defaults?.allowReorder ?? false;
  const enableGallery = enableGalleryProp ?? defaults?.enableGallery ?? true;

  const { data: session } = useSession();
  const accessToken = session?.user?.accessToken;
  const activeCompanyId = (session?.user as { activeCompanyId?: string | null } | undefined)
    ?.activeCompanyId;

  const dropZoneId = useId();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ——— Persisted state ———
  const [assets, setAssets] = useState<MultimediaAssetListItem[]>([]);
  const [loading, setLoading] = useState(mode === "persisted");
  const [busy, setBusy] = useState(false);

  // ——— Staging state ———
  const [stagingItems, setStagingItems] = useState<MultimediaStagingItem[]>([]);
  const [internalPrimaryIndex, setInternalPrimaryIndex] = useState(0);

  const stagingPrimaryIndex = controlledPrimaryIndex ?? internalPrimaryIndex;
  const setStagingPrimaryIndex = onStagingPrimaryIndexChange ?? setInternalPrimaryIndex;

  const loadPersisted = useCallback(async () => {
    if (mode !== "persisted" || !entityType || !entityId?.trim()) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const r = await listMultimediaForEntityAction(entityType, entityId.trim(), attributeId);
    setLoading(false);
    if (r.success) {
      setAssets(r.assets);
    } else {
      setError(r.error);
      setAssets([]);
    }
  }, [mode, entityType, entityId, attributeId]);

  useEffect(() => {
    void loadPersisted();
  }, [loadPersisted]);

  useEffect(() => {
    if (mode !== "staging") {
      return;
    }
    setStagingItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return filesToStagingItems(value, controlledPrimaryIndex ?? 0);
    });
    setInternalPrimaryIndex(controlledPrimaryIndex ?? 0);
  }, [mode, stagingResetKey]);

  useEffect(() => {
    return () => {
      stagingItems.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [stagingItems]);

  const syncStagingToParent = (items: MultimediaStagingItem[], primaryIdx: number) => {
    onChange?.(stagingItemsToFiles(items));
    setStagingPrimaryIndex(primaryIdx);
  };

  const addStagingFiles = (incoming: File[]) => {
    const { valid, errors } = filterValidMultimediaFiles(incoming, {
      maxSizeMb,
      maxFiles,
      currentCount: stagingItems.length,
    });
    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
    if (valid.length === 0) {
      return;
    }
    const newItems = valid.map((file) => ({
      clientId: newClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: false,
    }));
    const merged = [...stagingItems, ...newItems];
    let primaryIdx = stagingPrimaryIndex;
    if (merged.length > 0 && (stagingItems.length === 0 || stagingPrimaryIndex >= merged.length)) {
      primaryIdx = 0;
    }
    const withPrimary = merged.map((item, i) => ({
      ...item,
      isPrimary: allowPrimary ? i === primaryIdx : false,
    }));
    setStagingItems(withPrimary);
    syncStagingToParent(withPrimary, primaryIdx);
    setError(null);
  };

  const uploadPersistedFiles = async (files: File[]) => {
    const et = entityType as MultimediaEntityType;
    const id = entityId?.trim();
    if (!id || disabled || files.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let markPrimary = assets.length === 0;
      let uploadedAny = false;
      for (const file of files) {
        const r = await uploadMultimediaForEntityClient({
          file,
          entityType: et,
          entityId: id,
          isPrimary: markPrimary && allowPrimary,
          attributeId,
          accessToken,
          activeCompanyId,
        });
        markPrimary = false;
        if (!r.success) {
          setError(r.error);
          break;
        }
        uploadedAny = true;
      }
      if (uploadedAny) {
        await revalidateMultimediaCachesAction(et, id);
      }
      await loadPersisted();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const handlePickFiles = (files: File[]) => {
    if (mode === "staging") {
      addStagingFiles(files);
    } else {
      const { valid, errors } = filterValidMultimediaFiles(files, {
        maxSizeMb,
        maxFiles,
        currentCount: assets.length,
      });
      if (errors.length > 0) {
        setError(errors.join("\n"));
      }
      if (valid.length > 0) {
        void uploadPersistedFiles(valid);
      }
    }
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || busy || !allowDragDrop || layout !== "collection") {
      return;
    }
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) {
      handlePickFiles(dropped);
    }
  };

  const persistedGridItems: MultimediaGridItem[] = useMemo(
    () => assets.map((asset) => ({ kind: "persisted" as const, asset })),
    [assets],
  );

  const stagingGridItems: MultimediaGridItem[] = useMemo(
    () =>
      stagingItems.map((staging) => ({
        kind: "staging" as const,
        staging,
      })),
    [stagingItems],
  );

  const gridItems = mode === "persisted" ? persistedGridItems : stagingGridItems;

  const handleRemove = (item: MultimediaGridItem, index: number) => {
    if (mode === "staging" && item.kind === "staging") {
      URL.revokeObjectURL(item.staging.previewUrl);
      const next = stagingItems.filter((_, i) => i !== index);
      let primaryIdx = stagingPrimaryIndex;
      if (primaryIdx >= next.length) {
        primaryIdx = Math.max(0, next.length - 1);
      }
      const withPrimary = next.map((s, i) => ({
        ...s,
        isPrimary: allowPrimary ? i === primaryIdx : false,
      }));
      setStagingItems(withPrimary);
      syncStagingToParent(withPrimary, primaryIdx);
      return;
    }
    if (mode === "persisted" && item.kind === "persisted" && entityType && entityId) {
      void (async () => {
        setBusy(true);
        const r = await unlinkMultimediaFromEntityAction({
          assetId: item.asset.id,
          entityType,
          entityId: entityId.trim(),
          usageType: "default",
          attributeId,
        });
        setBusy(false);
        if (r.success) {
          await loadPersisted();
          onChanged?.();
        } else {
          setError(r.error);
        }
      })();
    }
  };

  const handleSetPrimary = (item: MultimediaGridItem, index: number) => {
    if (!allowPrimary) {
      return;
    }
    if (mode === "staging" && item.kind === "staging") {
      const withPrimary = stagingItems.map((s, i) => ({
        ...s,
        isPrimary: i === index,
      }));
      setStagingItems(withPrimary);
      syncStagingToParent(withPrimary, index);
      return;
    }
    if (mode === "persisted" && item.kind === "persisted" && entityType && entityId) {
      void (async () => {
        setBusy(true);
        const r = await setPrimaryMultimediaAssetAction({
          entityType,
          entityId: entityId.trim(),
          assetId: item.asset.id,
          attributeId,
        });
        setBusy(false);
        if (r.success) {
          await loadPersisted();
          onChanged?.();
        } else {
          setError(r.error);
        }
      })();
    }
  };

  const handleReorder = (from: number, to: number) => {
    if (mode === "staging") {
      const reordered = reorderArray(stagingItems, from, to);
      let primaryIdx = stagingPrimaryIndex;
      const primaryId = stagingItems[stagingPrimaryIndex]?.clientId;
      if (primaryId) {
        primaryIdx = reordered.findIndex((s) => s.clientId === primaryId);
      }
      const withPrimary = reordered.map((s, i) => ({
        ...s,
        isPrimary: allowPrimary ? i === primaryIdx : false,
      }));
      setStagingItems(withPrimary);
      syncStagingToParent(withPrimary, primaryIdx);
      return;
    }
    if (mode === "persisted" && entityType && entityId && allowReorder) {
      const reordered = reorderArray(assets, from, to);
      const assetIds = reordered.map((a) => a.id);
      void (async () => {
        setBusy(true);
        const r = await reorderMultimediaAssetsAction({
          entityType,
          entityId: entityId.trim(),
          assetIds,
          attributeId,
        });
        setBusy(false);
        if (r.success) {
          await loadPersisted();
          onChanged?.();
        } else {
          setError(r.error);
        }
      })();
    }
  };

  if (layout === "single") {
    return (
      <div className={className} data-test-id={testId}>
        <p className="text-xs text-muted-foreground">
          Modo single (`{singleVariant ?? "banner"}`): use CompanyLogoSection o MultimediaSingleSlot (fase 6).
        </p>
      </div>
    );
  }

  if (mode === "persisted" && (!entityId?.trim() || disabled)) {
    return null;
  }

  const showTitle = Boolean(title?.trim()) && !omitHeading;
  const showHeaderRow = !omitHeading || showTitle;

  const pickTrigger = (
    <MultimediaPickTrigger
      accept={accept}
      multiple
      disabled={disabled || busy || loading}
      pickButton={pickButton}
      layout="inline"
      onFilesSelected={handlePickFiles}
      data-test-id={`${testId}-pick`}
    />
  );

  return (
    <div
      className={`rounded-lg border border-border bg-muted/10 p-3 ${className}`}
      data-test-id={testId}
    >
      {showHeaderRow ? (
        <div
          className="mb-2 flex flex-wrap items-center gap-2"
          data-test-id={`${testId}-header`}
        >
          {pickTrigger}
          {showTitle ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mb-2 flex items-center">{pickTrigger}</div>
      )}

      {error ? (
        <Alert variant="error" className="mb-2" data-test-id={`${testId}-error`}>
          {error}
        </Alert>
      ) : null}

      {mode === "persisted" && loading ? (
        <LoadingState className="flex items-center justify-center py-4" size={12} />
      ) : null}

      <div
        id={dropZoneId}
        className={`space-y-3 ${isDragOver && allowDragDrop ? "rounded-lg border-2 border-dashed border-primary bg-primary/5" : ""}`}
        onDragOver={(e) => {
          if (allowDragDrop && layout === "collection") {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDropZone}
      >
        {gridItems.length > 0 ? (
          <MultimediaCollectionGrid
            items={gridItems}
            aspectRatio={aspectRatio}
            allowPrimary={allowPrimary}
            enableGallery={enableGallery}
            disabled={disabled}
            busy={busy || loading}
            allowReorder={allowReorder}
            onRemove={handleRemove}
            onSetPrimary={handleSetPrimary}
            onReorder={handleReorder}
            data-test-id={`${testId}-grid`}
          />
        ) : null}
      </div>
    </div>
  );
}
