import { buildScaleReading } from "./parse";
import type { ScaleReading, ScaleStorageV1 } from "./types";
import { readWeightViaWebSerial } from "./web-serial";

export type ReadWeightOptions = {
  port?: SerialPort;
  timeoutMs?: number;
};

export async function readWeightFromScale(
  config: ScaleStorageV1,
  options?: ReadWeightOptions,
): Promise<ScaleReading> {
  const rawFrame = await readWeightViaWebSerial(config, options);
  const reading = buildScaleReading(rawFrame, config.outputUnit);
  if (!reading) {
    throw new Error(`No se pudo interpretar la trama de la balanza: "${rawFrame}"`);
  }
  return reading;
}
