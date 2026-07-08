export type CatalogSyncPhase = "idle" | "syncing" | "ready" | "error";

export type CatalogSyncProgress = {
  phase: CatalogSyncPhase;
  downloaded: number;
  persisted: number;
  total: number;
};

const IDLE: CatalogSyncProgress = {
  phase: "idle",
  downloaded: 0,
  persisted: 0,
  total: 0,
};

let state: CatalogSyncProgress = { ...IDLE };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Referencia estable entre updates — requerido por useSyncExternalStore. */
export function getCatalogSyncProgress(): CatalogSyncProgress {
  return state;
}

export function setCatalogSyncProgress(patch: Partial<CatalogSyncProgress>): void {
  state = { ...state, ...patch };
  emit();
}

export function beginCatalogSync(total = 0): void {
  state = {
    phase: "syncing",
    downloaded: 0,
    persisted: 0,
    total: Math.max(0, total),
  };
  emit();
}

export function updateCatalogSyncProgress(progress: {
  downloaded: number;
  persisted: number;
  total: number;
}): void {
  state = {
    phase: "syncing",
    downloaded: progress.downloaded,
    persisted: progress.persisted,
    total: Math.max(progress.total, progress.downloaded, progress.persisted),
  };
  emit();
}

export function completeCatalogSync(total: number): void {
  const n = Math.max(0, total);
  state = {
    phase: "ready",
    downloaded: n,
    persisted: n,
    total: n,
  };
  emit();
}

export function failCatalogSync(): void {
  state = { ...state, phase: "error" };
  emit();
}

export function hydrateCatalogSyncFromCounts(args: {
  ready: boolean;
  rowCount: number;
}): void {
  if (state.phase === "syncing") return;
  if (args.ready && args.rowCount > 0) {
    if (state.phase === "ready" && state.total === args.rowCount) return;
    completeCatalogSync(args.rowCount);
    return;
  }
  const next: CatalogSyncProgress = {
    phase: "idle",
    downloaded: 0,
    persisted: args.rowCount,
    total: 0,
  };
  if (
    state.phase === next.phase &&
    state.downloaded === next.downloaded &&
    state.persisted === next.persisted &&
    state.total === next.total
  ) {
    return;
  }
  state = next;
  emit();
}

export function subscribeCatalogSyncProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function catalogDownloadPercent(progress: CatalogSyncProgress): number {
  if (progress.phase === "ready") return 100;
  if (progress.total <= 0) return 0;
  return Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
}

export function catalogIdbPercent(progress: CatalogSyncProgress): number {
  if (progress.phase === "ready") return 100;
  if (progress.total <= 0) return progress.persisted > 0 ? 5 : 0;
  return Math.min(100, Math.round((progress.persisted / progress.total) * 100));
}

export function formatCatalogSyncTooltip(progress: CatalogSyncProgress): string {
  const dl = catalogDownloadPercent(progress);
  const idb = catalogIdbPercent(progress);
  if (progress.phase === "ready") {
    return `Catálogo offline listo (${progress.total} productos)`;
  }
  if (progress.phase === "error") {
    return "Error al sincronizar catálogo offline";
  }
  if (progress.phase === "syncing") {
    return `Descarga ${dl}% (${progress.downloaded}/${progress.total || "?"}) · IndexedDB ${idb}% (${progress.persisted}/${progress.total || "?"})`;
  }
  if (progress.persisted > 0) {
    return `Catálogo offline pendiente (${progress.persisted} en IndexedDB)`;
  }
  return "Catálogo offline pendiente";
}
