export type ScaleOutputUnit = "g" | "oz" | "ct";

export type ScaleStorageV1 = {
  enabled: boolean;
  baudRate: number;
  dataBits: 8;
  parity: "none";
  stopBits: 1;
  delimiter: string;
  requestCommand: string;
  outputUnit: ScaleOutputUnit;
  usbVendorId?: number;
  usbProductId?: number;
};

export type ScaleReading = {
  rawFrame: string;
  value: number;
  unit: string | null;
  weightGrams: number;
};

export type ParsedScaleFrame = {
  value: number | null;
  unit: string | null;
};
