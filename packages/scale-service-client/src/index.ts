export type {
  ScaleOutputUnit,
  ScaleStorageV1,
  ScaleReading,
  ParsedScaleFrame,
} from "./types";

export {
  SCALE_STORAGE_KEY,
  readScaleConfigFromStorage,
  writeScaleConfigToStorage,
} from "./storage";

export { parseScaleFrame, normalizeWeightToGrams, buildScaleReading } from "./parse";

export {
  isWebSerialSupported,
  buildSerialPortFilters,
  formatSerialPortLabel,
  requestSerialPort,
  getAuthorizedSerialPorts,
  probeSerialCommunication,
  readWeightViaWebSerial,
  type ProbeSerialResult,
} from "./web-serial";

export { readWeightFromScale, type ReadWeightOptions } from "./read-weight";
