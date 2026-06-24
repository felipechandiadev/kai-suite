import type { ScaleStorageV1 } from "./types";

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
          throw new Error("Tiempo de espera agotado esperando datos de la balanza.");
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
        throw new Error(
          config.requestCommand
            ? "No se recibieron datos. Verifique la balanza y el comando configurado."
            : "No se recibieron datos. Presione PRINT en la balanza o configure un comando de solicitud.",
        );
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

export async function readWeightViaWebSerial(
  config: ScaleStorageV1,
  options?: { port?: SerialPort; timeoutMs?: number },
): Promise<string> {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial no está disponible en este navegador.");
  }

  let port = options?.port;
  if (!port) {
    const authorized = await getAuthorizedSerialPorts();
    if (authorized.length === 0) {
      throw new Error(
        "No hay puertos autorizados. Configure la balanza en Configuración → Balanza y autorice el puerto USB.",
      );
    }
    port = authorized[0];
  }

  return readFrameFromPort(port, config, options?.timeoutMs ?? 10_000);
}
