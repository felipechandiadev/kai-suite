import type { ScaleStorageV1 } from "./types";

function formatHexId(value: number): string {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function buildSerialPortFilters(config: ScaleStorageV1): SerialPortFilter[] {
  const filters: SerialPortFilter[] = [];
  if (config.usbVendorId != null && config.usbProductId != null) {
    filters.push({
      usbVendorId: config.usbVendorId,
      usbProductId: config.usbProductId,
    });
  }
  return filters;
}

export function formatSerialPortLabel(port: SerialPort, index: number): string {
  const info = port.getInfo();
  if (info.usbVendorId != null && info.usbProductId != null) {
    return `Puerto ${index + 1} · USB ${formatHexId(info.usbVendorId)} / ${formatHexId(info.usbProductId)}`;
  }
  return `Puerto serial ${index + 1}`;
}

export async function requestSerialPort(config: ScaleStorageV1): Promise<SerialPort> {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial no está disponible en este navegador. Use Chrome o Edge.");
  }
  const filters = buildSerialPortFilters(config);
  return navigator.serial.requestPort(filters.length > 0 ? { filters } : undefined);
}

export async function getAuthorizedSerialPorts(): Promise<SerialPort[]> {
  if (!isWebSerialSupported()) {
    return [];
  }
  return navigator.serial.getPorts();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readFrameFromPort(
  port: SerialPort,
  config: ScaleStorageV1,
  timeoutMs: number,
): Promise<string> {
  await port.open({
    baudRate: config.baudRate,
    dataBits: config.dataBits,
    parity: config.parity,
    stopBits: config.stopBits,
  });

  try {
    if (!port.readable) {
      throw new Error("El puerto serial no expone un stream de lectura.");
    }

    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      if (config.requestCommand && port.writable) {
        const writer = port.writable.getWriter();
        try {
          await writer.write(new TextEncoder().encode(config.requestCommand));
        } finally {
          writer.releaseLock();
        }
        await delay(50);
      }

      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const remaining = deadline - Date.now();
        const readPromise = reader.read();
        const result = await Promise.race([
          readPromise,
          delay(remaining).then(() => ({ timedOut: true as const })),
        ]);

        if ("timedOut" in result) {
          throw new Error("TIMEOUT");
        }

        const { value, done } = result;
        if (done) {
          break;
        }
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          if (buffer.includes(config.delimiter) || buffer.includes("\n") || buffer.includes("\r")) {
            break;
          }
        }
      }

      if (!buffer.trim()) {
        throw new Error("TIMEOUT");
      }

      return buffer.trim();
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore if already released
      }
    }
  } finally {
    try {
      await port.close();
    } catch {
      // port may already be closed
    }
  }
}

export type ProbeSerialResult = {
  ok: boolean;
  rawFrame?: string;
  message: string;
};

export async function probeSerialCommunication(
  config: ScaleStorageV1,
  options?: { port?: SerialPort; timeoutMs?: number },
): Promise<ProbeSerialResult> {
  const port = options?.port ?? (await resolveAuthorizedPort(config));
  const timeoutMs = options?.timeoutMs ?? 6_000;

  try {
    const rawFrame = await readFrameFromPort(port, config, timeoutMs);
    return {
      ok: true,
      rawFrame,
      message: `Comunicación correcta. Datos recibidos: ${rawFrame}`,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "TIMEOUT";
    if (isTimeout) {
      return {
        ok: false,
        message:
          "El puerto se abrió pero no llegaron datos. Revise el cable, el baud rate (9600) y presione PRINT en la balanza.",
      };
    }
    throw err;
  }
}

async function resolveAuthorizedPort(config: ScaleStorageV1): Promise<SerialPort> {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial no está disponible en este navegador.");
  }

  const authorized = await getAuthorizedSerialPorts();
  if (authorized.length === 0) {
    throw new Error(
      "No hay puerto serial seleccionado. Use «Seleccionar puerto COM / serial» y elija el dispositivo en Chrome.",
    );
  }

  const index = config.selectedPortIndex ?? 0;
  const port = authorized[index] ?? authorized[0];
  if (!port) {
    throw new Error("No se pudo resolver el puerto serial autorizado.");
  }
  return port;
}

export async function readWeightViaWebSerial(
  config: ScaleStorageV1,
  options?: { port?: SerialPort; timeoutMs?: number },
): Promise<string> {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial no está disponible en este navegador.");
  }

  const port = options?.port ?? (await resolveAuthorizedPort(config));
  return readFrameFromPort(port, config, options?.timeoutMs ?? 10_000);
}
