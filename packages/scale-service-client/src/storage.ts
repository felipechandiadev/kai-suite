import type { ScaleStorageV1 } from "./types";

export const SCALE_STORAGE_KEY = "flowstore.admin.scale.v1";

const DEFAULTS: ScaleStorageV1 = {
  enabled: false,
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  delimiter: "\r\n",
  requestCommand: "",
  outputUnit: "g",
  usbVendorId: 0x0403,
  usbProductId: 0x6001,
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
    const raw = window.localStorage.getItem(SCALE_STORAGE_KEY);
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
      usbVendorId: parseUsbId(parsed.usbVendorId) ?? DEFAULTS.usbVendorId,
      usbProductId: parseUsbId(parsed.usbProductId) ?? DEFAULTS.usbProductId,
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
  window.localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify({ ...prev, ...patch }));
}
