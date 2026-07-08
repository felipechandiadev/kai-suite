export type OfflineTelemetryEvent =
  | "offline_bootstrap_complete"
  | "offline_catalog_download"
  | "offline_catalog_delta"
  | "offline_sync_batch"
  | "offline_sale_committed";

export function logOfflineTelemetry(
  event: OfflineTelemetryEvent,
  payload: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ source: "pos_offline", event, at: new Date().toISOString(), ...payload }));
}
