"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  formatSerialPortLabel,
  getAuthorizedSerialPorts,
  isWebSerialSupported,
  probeSerialCommunication,
  readScaleConfigFromStorage,
  readWeightFromScale,
  requestSerialPort,
  writeScaleConfigToStorage,
  type ScaleOutputUnit,
} from "@kai/scale-service-client";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch";
import TextField from "@/shared/components/TextField";

type Props = {
  className?: string;
};

type PortOption = {
  index: number;
  label: string;
};

export function AdminScaleSettingsForm({ className = "" }: Props) {
  const formId = useId();

  const [enabled, setEnabled] = useState(false);
  const [baudRate, setBaudRate] = useState("9600");
  const [delimiter, setDelimiter] = useState("\\r\\n");
  const [requestCommand, setRequestCommand] = useState("");
  const [outputUnit, setOutputUnit] = useState<ScaleOutputUnit>("g");
  const [selectedPortIndex, setSelectedPortIndex] = useState("0");

  const [portOptions, setPortOptions] = useState<PortOption[]>([]);
  const [portMessage, setPortMessage] = useState<string | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<{ ok: boolean; message: string; rawFrame?: string } | null>(
    null,
  );
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightResult, setWeightResult] = useState<{
    rawFrame: string;
    weightGrams: number;
    unit: string | null;
  } | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refreshAuthorizedPorts = useCallback(async () => {
    const ports = await getAuthorizedSerialPorts();
    setPortOptions(
      ports.map((port, index) => ({
        index,
        label: formatSerialPortLabel(port, index),
      })),
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    const cfg = readScaleConfigFromStorage();
    setEnabled(cfg.enabled);
    setBaudRate(String(cfg.baudRate));
    setDelimiter(cfg.delimiter === "\r\n" ? "\\r\\n" : cfg.delimiter);
    setRequestCommand(cfg.requestCommand);
    setOutputUnit(cfg.outputUnit);
    setSelectedPortIndex(String(cfg.selectedPortIndex ?? 0));
    void refreshAuthorizedPorts();
  }, [refreshAuthorizedPorts]);

  const buildConfigFromForm = useCallback(() => {
    const parsedDelimiter =
      delimiter === "\\r\\n" ? "\r\n" : delimiter === "\\n" ? "\n" : delimiter;
    const portIndex = Number.parseInt(selectedPortIndex, 10);
    return {
      enabled,
      baudRate: Number(baudRate) || 9600,
      dataBits: 8 as const,
      parity: "none" as const,
      stopBits: 1 as const,
      delimiter: parsedDelimiter,
      requestCommand,
      outputUnit,
      selectedPortIndex: Number.isFinite(portIndex) && portIndex >= 0 ? portIndex : 0,
    };
  }, [enabled, baudRate, delimiter, requestCommand, outputUnit, selectedPortIndex]);

  const saveLocal = useCallback(() => {
    writeScaleConfigToStorage(buildConfigFromForm());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [buildConfigFromForm]);

  const handleSelectPort = async () => {
    setPortMessage(null);
    setProbeResult(null);
    setWeightResult(null);
    setWeightError(null);
    try {
      saveLocal();
      const cfg = readScaleConfigFromStorage();
      await requestSerialPort(cfg);
      await refreshAuthorizedPorts();
      const ports = await getAuthorizedSerialPorts();
      const newIndex = Math.max(0, ports.length - 1);
      setSelectedPortIndex(String(newIndex));
      writeScaleConfigToStorage({ selectedPortIndex: newIndex });
      setPortMessage(
        ports.length === 1
          ? "Puerto serial autorizado en este navegador. Continúe con la prueba de comunicación."
          : `${ports.length} puertos autorizados. Seleccione el activo si tiene más de uno.`,
      );
    } catch (err) {
      setPortMessage(err instanceof Error ? err.message : "No se pudo seleccionar el puerto.");
    }
  };

  const handleProbeCommunication = async () => {
    setProbeLoading(true);
    setProbeResult(null);
    setWeightError(null);
    try {
      saveLocal();
      const cfg = readScaleConfigFromStorage();
      if (!cfg.enabled) {
        throw new Error("Active la balanza antes de probar la comunicación.");
      }
      const ports = await getAuthorizedSerialPorts();
      const portIndex = cfg.selectedPortIndex ?? 0;
      const port = ports[portIndex] ?? ports[0];
      if (!port) {
        throw new Error("Primero seleccione el puerto COM / serial en el paso 1.");
      }
      const result = await probeSerialCommunication(cfg, { port });
      setProbeResult(result);
    } catch (err) {
      setProbeResult({
        ok: false,
        message: err instanceof Error ? err.message : "Error al probar la comunicación.",
      });
    } finally {
      setProbeLoading(false);
    }
  };

  const handleTestWeight = async () => {
    setWeightLoading(true);
    setWeightError(null);
    setWeightResult(null);
    try {
      saveLocal();
      const cfg = readScaleConfigFromStorage();
      if (!cfg.enabled) {
        throw new Error("Active la balanza antes de probar el pesaje.");
      }
      const ports = await getAuthorizedSerialPorts();
      const portIndex = cfg.selectedPortIndex ?? 0;
      const port = ports[portIndex] ?? ports[0];
      if (!port) {
        throw new Error("Primero seleccione el puerto COM / serial en el paso 1.");
      }
      const reading = await readWeightFromScale(cfg, { port });
      setWeightResult({
        rawFrame: reading.rawFrame,
        weightGrams: reading.weightGrams,
        unit: reading.unit,
      });
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : "Error al leer el peso.");
    } finally {
      setWeightLoading(false);
    }
  };

  const hasAuthorizedPort = portOptions.length > 0;
  const webSerialSupported = mounted && isWebSerialSupported();

  return (
    <form
      id={formId}
      className={`space-y-6 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        saveLocal();
      }}
    >
      {mounted && !webSerialSupported ? (
        <Alert variant="warning">
          Web Serial no está disponible en este navegador. Use <strong>Chrome</strong> o{" "}
          <strong>Edge</strong> en el mismo equipo donde está conectada la balanza.
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">1. Instalación del cable (en el equipo)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Windows:</strong> conecte el cable y verifique en Administrador de dispositivos que
            aparezca un puerto <strong>COM</strong> (p. ej. COM3). Instale el driver del adaptador si hace
            falta.
          </li>
          <li>
            <strong>macOS:</strong> el sistema suele reconocer el adaptador automáticamente al conectar el
            USB.
          </li>
          <li>
            La balanza debe estar en <strong>9600 baud, 8N1</strong> (modelo referencia A6701979).
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">2. Seleccionar puerto serial</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chrome mostrará los puertos disponibles (en Windows verá el <strong>COM</strong> configurado).
          El navegador guarda el permiso; no hace falta repetir en cada visita.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void handleSelectPort()}
            disabled={!mounted || !webSerialSupported}
            data-test-id="scale-settings-select-port"
          >
            Seleccionar puerto COM / serial
          </Button>
          <span className="text-sm text-muted-foreground">
            {hasAuthorizedPort
              ? `${portOptions.length} puerto(s) autorizado(s) en este navegador`
              : "Sin puerto seleccionado"}
          </span>
        </div>
        {portOptions.length > 1 ? (
          <div className="mt-4 max-w-md">
            <Select
              label="Puerto activo"
              value={selectedPortIndex}
              onChange={setSelectedPortIndex}
              options={portOptions.map((p) => ({ id: String(p.index), label: p.label }))}
            />
          </div>
        ) : null}
        {hasAuthorizedPort && portOptions.length === 1 ? (
          <p className="mt-2 text-sm text-muted-foreground">{portOptions[0]?.label}</p>
        ) : null}
        {portMessage ? <p className="mt-2 text-sm text-muted-foreground">{portMessage}</p> : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Estado y parámetros</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label="Balanza habilitada"
            labelPosition="right"
            data-test-id="scale-settings-enabled"
          />
          <div className="grid gap-4 sm:grid-cols-2">
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
            />
            <TextField
              label="Comando de solicitud (opcional)"
              name="scale-command"
              value={requestCommand}
              onChange={(e) => setRequestCommand(e.target.value)}
              placeholder="Vacío = presionar PRINT en la balanza"
              alwaysShowLabel
              className="sm:col-span-2"
            />
            <Select
              label="Unidad esperada"
              value={outputUnit}
              onChange={(v) => setOutputUnit(v === "oz" || v === "ct" ? v : "g")}
              options={[
                { id: "g", label: "Gramos (g)" },
                { id: "oz", label: "Onzas (oz)" },
                { id: "ct", label: "Quilates (ct)" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">3. Probar comunicación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Abre el puerto y verifica que lleguen datos. Si no configuró comando automático, presione{" "}
          <strong>PRINT</strong> en la balanza durante la prueba.
        </p>
        <Button
          type="button"
          variant="outlined"
          size="md"
          className="mt-4"
          onClick={() => void handleProbeCommunication()}
          disabled={probeLoading || !hasAuthorizedPort}
          data-test-id="scale-settings-probe"
        >
          {probeLoading ? "Probando…" : "Probar comunicación"}
        </Button>
        {probeResult ? (
          <div className="mt-3">
            <Alert variant={probeResult.ok ? "success" : "warning"}>{probeResult.message}</Alert>
            {probeResult.rawFrame ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">{probeResult.rawFrame}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">4. Probar pesaje</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Coloque un objeto en la balanza y lea el peso en gramos para la calculadora de joyería.
        </p>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-4"
          onClick={() => void handleTestWeight()}
          disabled={weightLoading || !hasAuthorizedPort}
          data-test-id="scale-settings-test-read"
        >
          {weightLoading ? "Leyendo…" : "Probar pesaje"}
        </Button>
        {weightError ? (
          <div className="mt-3">
            <Alert variant="error">{weightError}</Alert>
          </div>
        ) : null}
        {weightResult ? (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-sm text-green-700 dark:text-green-300">Pesaje correcto</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{weightResult.rawFrame}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {weightResult.weightGrams} g
              {weightResult.unit ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (reportado: {weightResult.unit})
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p>
          Trama esperada: <code className="font-mono text-xs">+000125.00 g</code> (16 caracteres aprox.).
        </p>
        <p className="mt-2">
          Luego use la calculadora en{" "}
          <Link href="/catalog/products" className="text-primary underline">
            Catálogo → Productos
          </Link>
          .
        </p>
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
