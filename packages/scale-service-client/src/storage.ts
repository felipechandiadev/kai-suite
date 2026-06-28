import type { ScaleStorageV1 } from "./types";
import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "../../../shared/storage-key-migrate";

export const SCALE_STORAGE_KEY = "kai.admin.scale.v1";
export const SCALE_STORAGE_KEY_LEGACY = "flowstore.admin.scale.v1";

const DEFAULTS: ScaleStorageV1 = {
  enabled: false,
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  delimiter: "\r\n",
  requestCommand: "",
  outputUnit: "g",
  selectedPortIndex: 0,
};

function parseUsbId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 0xffff) {
    return value;
  }
  return undefined;
}

export function readScaleConfigFromStorage(): ScaleStorageV1 {
  if (typeof window === "undefined") {
    return { ...DEFAULTS };
  }
  try {
    const raw = getMigratedLocalStorageItem(SCALE_STORAGE_KEY, SCALE_STORAGE_KEY_LEGACY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<ScaleStorageV1>;
    return {
      enabled: parsed.enabled === true,
      baudRate:
        typeof parsed.baudRate === "number" && parsed.baudRate > 0 ? parsed.baudRate : DEFAULTS.baudRate,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      delimiter:
        typeof parsed.delimiter === "string" && parsed.delimiter.length > 0
          ? parsed.delimiter
          : DEFAULTS.delimiter,
      requestCommand: typeof parsed.requestCommand === "string" ? parsed.requestCommand : "",
      outputUnit:
        parsed.outputUnit === "oz" || parsed.outputUnit === "ct" || parsed.outputUnit === "g"
          ? parsed.outputUnit
          : DEFAULTS.outputUnit,
      selectedPortIndex:
        typeof parsed.selectedPortIndex === "number" && parsed.selectedPortIndex >= 0
          ? parsed.selectedPortIndex
          : DEFAULTS.selectedPortIndex,
      usbVendorId: parseUsbId(parsed.usbVendorId),
      usbProductId: parseUsbId(parsed.usbProductId),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeScaleConfigToStorage(patch: Partial<ScaleStorageV1>): void {
  if (typeof window === "undefined") {
    return;
  }
  const prev = readScaleConfigFromStorage();
  setMigratedLocalStorageItem(
    SCALE_STORAGE_KEY,
    SCALE_STORAGE_KEY_LEGACY,
    JSON.stringify({ ...prev, ...patch }),
  );
}
