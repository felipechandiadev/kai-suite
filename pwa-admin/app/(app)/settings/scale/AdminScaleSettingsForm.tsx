"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  getAuthorizedSerialPorts,
  isWebSerialSupported,
  readScaleConfigFromStorage,
  readWeightFromScale,
  requestSerialPort,
  writeScaleConfigToStorage,
  type ScaleOutputUnit,
} from "@flowstore/scale-service-client";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch";
import TextField from "@/shared/components/TextField";

type Props = {
  className?: string;
};

function parseHexId(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed : `0x${trimmed}`;
  const n = Number.parseInt(normalized, 16);
  return Number.isFinite(n) && n >= 0 && n <= 0xffff ? n : undefined;
}

function formatHexId(value: number | undefined): string {
  if (value == null) return "";
  return `0x${value.toString(16).padStart(4, "0")}`;
}

export function AdminScaleSettingsForm({ className = "" }: Props) {
  const formId = useId();
  const webSerialSupported = isWebSerialSupported();

  const [enabled, setEnabled] = useState(false);
  const [baudRate, setBaudRate] = useState("9600");
  const [delimiter, setDelimiter] = useState("\\r\\n");
  const [requestCommand, setRequestCommand] = useState("");
  const [outputUnit, setOutputUnit] = useState<ScaleOutputUnit>("g");
  const [usbVendorId, setUsbVendorId] = useState("0x0403");
  const [usbProductId, setUsbProductId] = useState("0x6001");

  const [authorizedPortCount, setAuthorizedPortCount] = useState(0);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    rawFrame: string;
    weightGrams: number;
    unit: string | null;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const refreshAuthorizedPorts = useCallback(async () => {
    const ports = await getAuthorizedSerialPorts();
    setAuthorizedPortCount(ports.length);
  }, []);

  useEffect(() => {
    const cfg = readScaleConfigFromStorage();
    setEnabled(cfg.enabled);
    setBaudRate(String(cfg.baudRate));
    setDelimiter(cfg.delimiter === "\r\n" ? "\\r\\n" : cfg.delimiter);
    setRequestCommand(cfg.requestCommand);
    setOutputUnit(cfg.outputUnit);
    setUsbVendorId(formatHexId(cfg.usbVendorId));
    setUsbProductId(formatHexId(cfg.usbProductId));
    void refreshAuthorizedPorts();
  }, [refreshAuthorizedPorts]);

  const buildConfigFromForm = useCallback(() => {
    const parsedDelimiter =
      delimiter === "\\r\\n" ? "\r\n" : delimiter === "\\n" ? "\n" : delimiter;
    return {
      enabled,
      baudRate: Number(baudRate) || 9600,
      dataBits: 8 as const,
      parity: "none" as const,
      stopBits: 1 as const,
      delimiter: parsedDelimiter,
      requestCommand,
      outputUnit,
      usbVendorId: parseHexId(usbVendorId),
      usbProductId: parseHexId(usbProductId),
    };
  }, [
    enabled,
    baudRate,
    delimiter,
    requestCommand,
    outputUnit,
    usbVendorId,
    usbProductId,
  ]);

  const saveLocal = useCallback(() => {
    writeScaleConfigToStorage(buildConfigFromForm());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [buildConfigFromForm]);

  const handleConnectPort = async () => {
    setConnectMessage(null);
    try {
      saveLocal();
      const cfg = readScaleConfigFromStorage();
      await requestSerialPort(cfg);
      await refreshAuthorizedPorts();
      setConnectMessage("Puerto autorizado correctamente. Ya puede probar la lectura.");
    } catch (err) {
      setConnectMessage(err instanceof Error ? err.message : "No se pudo autorizar el puerto.");
    }
  };

  const handleTestRead = async () => {
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      saveLocal();
      const cfg = readScaleConfigFromStorage();
      if (!cfg.enabled) {
        throw new Error("Active la balanza antes de probar la lectura.");
      }
      const reading = await readWeightFromScale(cfg);
      setTestResult({
        rawFrame: reading.rawFrame,
        weightGrams: reading.weightGrams,
        unit: reading.unit,
      });
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Error al leer la balanza.");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <form
      id={formId}
      className={`space-y-6 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        saveLocal();
      }}
    >
      {!webSerialSupported ? (
        <Alert variant="warning">
          Web Serial no está disponible en este navegador. Use Chrome o Edge en el mismo equipo donde
          está conectada la balanza.
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Estado</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label="Balanza habilitada"
            labelPosition="right"
            data-test-id="scale-settings-enabled"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Parámetros serial (Web Serial)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuración estándar para convertidor FTDI y balanza modelo A6701979 (9600 8N1).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label="Baud rate"
            name="scale-baud"
            value={baudRate}
            onChange={(e) => setBaudRate(e.target.value)}
            alwaysShowLabel
            data-test-id="scale-settings-baud"
          />
          <TextField
            label="Delimitador"
            name="scale-delimiter"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            placeholder="\\r\\n"
            alwaysShowLabel
            helperText='Use \\r\\n para retorno de carro + salto de línea'
          />
          <TextField
            label="Comando de solicitud (opcional)"
            name="scale-command"
            value={requestCommand}
            onChange={(e) => setRequestCommand(e.target.value)}
            placeholder='Ej: P\\r\\n o vacío para PRINT manual'
            alwaysShowLabel
            className="sm:col-span-2"
          />
          <Select
            label="Unidad esperada"
            value={outputUnit}
            onChange={(v) =>
              setOutputUnit(v === "oz" || v === "ct" ? v : "g")
            }
            options={[
              { id: "g", label: "Gramos (g)" },
              { id: "oz", label: "Onzas (oz)" },
              { id: "ct", label: "Quilates (ct)" },
            ]}
          />
          <TextField
            label="USB Vendor ID"
            name="scale-vendor"
            value={usbVendorId}
            onChange={(e) => setUsbVendorId(e.target.value)}
            alwaysShowLabel
          />
          <TextField
            label="USB Product ID"
            name="scale-product"
            value={usbProductId}
            onChange={(e) => setUsbProductId(e.target.value)}
            alwaysShowLabel
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => void handleConnectPort()}
            disabled={!webSerialSupported}
            data-test-id="scale-settings-connect-port"
          >
            Conectar / autorizar puerto USB
          </Button>
          <span className="text-sm text-muted-foreground">
            Puertos autorizados: {authorizedPortCount}
          </span>
        </div>
        {connectMessage ? (
          <p className="mt-2 text-sm text-muted-foreground">{connectMessage}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Prueba de lectura</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Coloque un objeto en la balanza y presione leer. Si no configuró comando automático,
          presione PRINT en la balanza durante la lectura.
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-4"
          onClick={() => void handleTestRead()}
          disabled={testLoading}
          data-test-id="scale-settings-test-read"
        >
          {testLoading ? "Leyendo…" : "Leer peso"}
        </Button>
        {testError ? (
          <div className="mt-3">
            <Alert variant="error">{testError}</Alert>
          </div>
        ) : null}
        {testResult ? (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm text-green-700 dark:text-green-300">Lectura exitosa</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{testResult.rawFrame}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {testResult.weightGrams} g
              {testResult.unit ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (reportado: {testResult.unit})
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Formato de trama</h2>
        <p className="mt-2">
          Cada lectura suele tener 16 caracteres con signo, valor y unidad. Ejemplo:{" "}
          <code className="font-mono text-xs">+000125.00 g</code>
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>9600 baud, 8 data bits, sin paridad, 1 stop bit.</li>
          <li>Presione PRINT para envío manual o habilite modo Continuous en la balanza.</li>
          <li>
            Guía de instalación:{" "}
            <a href="/downloads/INSTALACION_KAI_SCALE.md" className="text-primary underline" target="_blank" rel="noreferrer">
              INSTALACION_KAI_SCALE.md
            </a>
          </li>
          <li>
            Use la calculadora de joyería en{" "}
            <Link href="/catalog/products" className="text-primary underline">
              Catálogo → Productos
            </Link>{" "}
            tras verificar aquí la lectura.
          </li>
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" data-test-id="scale-settings-save">
          Guardar configuración
        </Button>
        {saved ? <span className="text-sm text-muted-foreground">Guardado en este navegador.</span> : null}
      </div>
    </form>
  );
}
