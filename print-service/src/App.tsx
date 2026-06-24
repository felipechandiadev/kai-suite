import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ChevronDown } from "lucide-react";
import IconButton from "./shared/components/IconButton/IconButton";
import InlineSwitchField from "./shared/components/InlineSwitchField";
import SharedTextField from "./shared/components/TextField/TextField";
import { AgentLogPanel } from "./features/agent-log/AgentLogPanel";
import { AppDialog } from "./shared/components/AppDialog/AppDialog";
import { Button } from "./components/Button";
import { PrinterMappingLineCard } from "./features/printer-mapping/PrinterMappingLineCard";
import {
  isLineDirty,
  isTicketNetworkLine,
  lineToSavePayload,
} from "./features/printer-mapping/mapping-line-utils";
import { isPlausibleNetworkHost } from "./features/printer-mapping/ticket-printer-type";
import { normalizePaperProfile } from "./features/printer-mapping/paper-profile-options";
import type {
  LinePrinterStatus,
  MappingLineHealthRow,
  MappingLineRow,
} from "./features/printer-mapping/types";

const APP_NAME = "KaiPrinters";
const DEFAULT_AGENT_DISPLAY_NAME = APP_NAME;
const APP_COPYRIGHT = "Felipe Chandía Castillo © 2026";

function normalizeAgentDisplayName(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  return t || DEFAULT_AGENT_DISPLAY_NAME;
}

const VALID_PURPOSES = ["tickets", "documents", "labels"] as const;
const DEFAULT_PURPOSE = "tickets";

function normalizeMappingPurpose(purpose: string | undefined): string {
  const p = (purpose?.trim() || DEFAULT_PURPOSE).toLowerCase();
  return (VALID_PURPOSES as readonly string[]).includes(p) ? p : DEFAULT_PURPOSE;
}

type PrinterRow = {
  name: string;
  default?: boolean;
  online?: boolean;
};

type MappingRow = { purpose: string; printerName?: string };

type ConnectedSession = {
  connectionId?: string;
  clientId?: string;
  appLabel?: string;
  userDisplayName?: string;
  companyName?: string;
  pointOfSaleName?: string;
  requiredPurposes?: string[];
};

type JobRow = {
  id?: string;
  status: string;
  filename?: string;
  purpose?: string;
  createdAt?: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  requestedBy?: string;
  error?: string;
};

type SumatraStatus = {
  installed?: boolean;
  path?: string;
  bundled?: boolean;
};

type DashboardPayload = {
  listenPort?: number;
  wssListenPort?: number;
  wssEnabled?: boolean;
  wsListening?: boolean;
  wssListening?: boolean;
  hostPlatform?: string;
  sumatra?: SumatraStatus;
  agentDisplayName?: string;
  printers?: PrinterRow[];
  mappings?: MappingRow[];
  mappingLines?: MappingLineRow[];
  printerHealth?: {
    overall?: string;
    message?: string;
    purposes?: Record<string, { status?: string; printerName?: string; printerNames?: unknown }>;
    lines?: Array<{ id?: string; status?: string; reason?: string }>;
  };
  jobs?: JobRow[];
  serviceStatus?: {
    connectedClients?: number;
    sessions?: ConnectedSession[];
  };
  metrics?: { jobsCompletedTotal?: number };
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoBasename(path: string | undefined): string {
  if (!path?.trim()) return "";
  const normalized = path.replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  return i >= 0 ? normalized.slice(i + 1) : normalized;
}

function newLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapHealthLines(
  rows?: Array<{ id?: string; status?: string; reason?: string }>,
): MappingLineHealthRow[] {
  return (rows ?? []).map((row) => {
    const raw = String(row?.status ?? "").trim().toLowerCase();
    const status: LinePrinterStatus | undefined =
      raw === "online" || raw === "offline" || raw === "unknown" ? raw : undefined;
    return {
      id: row?.id != null ? String(row.id) : undefined,
      status,
      reason: row?.reason != null ? String(row.reason) : undefined,
    };
  });
}

function mapDashboardLines(rows: DashboardPayload["mappingLines"]): MappingLineRow[] {
  return (rows ?? []).map((row) => {
    const purpose = normalizeMappingPurpose(row?.purpose);
    const ticketPrinterType =
      purpose === "tickets" && row?.ticketPrinterType != null
        ? (String(row.ticketPrinterType).trim().toLowerCase() === "network" ? "network" : "system")
        : undefined;
    const ticketNetworkHost =
      row?.ticketNetworkHost != null && String(row.ticketNetworkHost).trim()
        ? String(row.ticketNetworkHost).trim()
        : undefined;
    return {
      id: String(row?.id ?? newLineId()),
      purpose,
      systemPrinterName:
        row?.systemPrinterName != null && String(row.systemPrinterName).trim()
          ? String(row.systemPrinterName).trim()
          : "",
      sortOrder: typeof row?.sortOrder === "number" ? row.sortOrder : 0,
      displayLabel: row?.displayLabel ? String(row.displayLabel) : undefined,
      ticketPrinterType,
      ticketNetworkHost,
      autoCutEnabled: row?.autoCutEnabled !== false,
      drawerOpenEnabled: row?.drawerOpenEnabled === true,
      ticketLogoPath: row?.ticketLogoPath ? String(row.ticketLogoPath) : undefined,
      ticketLogoDisplayName: row?.ticketLogoPath ? logoBasename(String(row.ticketLogoPath)) : undefined,
      ticketLogoEnabled: row?.ticketLogoEnabled === true,
      paperProfile: normalizePaperProfile(
        purpose,
        row?.paperProfile != null ? String(row.paperProfile) : undefined,
      ),
    };
  });
}

function ConnectedSessionCard({ session }: { session: ConnectedSession }) {
  const app = session.appLabel?.trim() || "App";
  const person = session.userDisplayName?.trim() || "—";
  const company = session.companyName?.trim();
  const pos = session.pointOfSaleName?.trim();

  return (
    <article
      className="print-session-card min-w-0"
      title={[app, person, company, pos].filter(Boolean).join(" · ")}
    >
      <p className="truncate text-sm font-semibold text-foreground">{escapeHtml(app)}</p>
      <p className="mt-0.5 truncate text-xs text-foreground">{escapeHtml(person)}</p>
      {company ? (
        <p className="mt-1 truncate text-[0.6875rem] text-muted-foreground">{escapeHtml(company)}</p>
      ) : null}
      {pos ? (
        <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{escapeHtml(pos)}</p>
      ) : null}
    </article>
  );
}

export default function App() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [localLines, setLocalLines] = useState<MappingLineRow[]>([]);
  const [savedLines, setSavedLines] = useState<MappingLineRow[]>([]);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    listenPort: "",
    wssListenPort: "",
    wssEnabled: false,
    agentDisplayName: DEFAULT_AGENT_DISPLAY_NAME,
  });

  const [configEdit, setConfigEdit] = useState(false);
  const [settingsSaveBusy, setSettingsSaveBusy] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [lineSaveBusyId, setLineSaveBusyId] = useState<string | null>(null);
  const [escposQaBusyId, setEscposQaBusyId] = useState<string | null>(null);
  const [documentPrintTestBusyId, setDocumentPrintTestBusyId] = useState<string | null>(null);
  const [cutTestBusyId, setCutTestBusyId] = useState<string | null>(null);
  const [drawerTestBusyId, setDrawerTestBusyId] = useState<string | null>(null);
  const [networkProbeBusyId, setNetworkProbeBusyId] = useState<string | null>(null);
  const [printersRefreshBusy, setPrintersRefreshBusy] = useState(false);
  const [sumatraRefreshBusy, setSumatraRefreshBusy] = useState(false);
  const [wssCertDialog, setWssCertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  /** Solo mostramos acciones en la fila del summary cuando el `<details>` está expandido */
  const [configDetailsOpen, setConfigDetailsOpen] = useState(false);
  const [printersDetailsOpen, setPrintersDetailsOpen] = useState(false);

  const applyDashboardFull = useCallback((d: DashboardPayload) => {
    setDashboard(d);
    const lines = mapDashboardLines(d.mappingLines);
    setLocalLines(lines);
    setSavedLines(lines.map((l) => ({ ...l })));
    setSettings({
      listenPort: d.listenPort != null ? String(d.listenPort) : "",
      wssListenPort: d.wssListenPort != null ? String(d.wssListenPort) : "",
      wssEnabled: !!d.wssEnabled,
      agentDisplayName: normalizeAgentDisplayName(d.agentDisplayName),
    });
    setConfigEdit(false);
  }, []);

  const mergeDashboardLive = useCallback((d: DashboardPayload) => {
    setDashboard((prev) => {
      if (!prev) return d;
      return {
        ...prev,
        serviceStatus: d.serviceStatus ?? prev.serviceStatus,
        jobs: d.jobs,
        metrics: d.metrics,
        printerHealth: d.printerHealth,
        printers: d.printers,
        wsListening: d.wsListening,
        wssListening: d.wssListening,
        hostPlatform: d.hostPlatform,
        sumatra: d.sumatra,
      };
    });
  }, []);

  const fetchDashboard = useCallback(
    async (mode: "full" | "live") => {
      try {
        const d = (await invoke("get_dashboard")) as DashboardPayload;
        if (mode === "full") {
          applyDashboardFull(d);
        } else {
          mergeDashboardLive(d);
        }
      } catch {
        if (mode === "full") {
          setDashboard((prev) => prev ?? {});
          try {
            const port = await invoke("get_listen_port");
            setDashboard((p) => ({ ...p, listenPort: Number(port) }));
          } catch {
            setDashboard((p) => ({ ...p, listenPort: 14567 }));
          }
          try {
            const wss = await invoke("get_wss_listen_port");
            setDashboard((p) => ({ ...p, wssListenPort: Number(wss) }));
          } catch {
            setDashboard((p) => ({ ...p, wssListenPort: 14568 }));
          }
        }
      }
    },
    [applyDashboardFull, mergeDashboardLive],
  );

  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      await fetchDashboard("full");
      unlisten = await listen("dashboard-update", () => {
        void fetchDashboard("live");
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [fetchDashboard]);

  const printers = dashboard?.printers ?? [];
  const mappingLineHealth = mapHealthLines(dashboard?.printerHealth?.lines);
  const jobs = dashboard?.jobs ?? [];
  const sessions = dashboard?.serviceStatus?.sessions ?? [];
  const isWindows = dashboard?.hostPlatform === "windows";
  const sumatra = dashboard?.sumatra;
  const wsListening = Boolean(dashboard?.wsListening);
  const wssListening = Boolean(dashboard?.wssListening);
  const wssEnabledCfg = Boolean(dashboard?.wssEnabled);
  /** WS activo; si WSS está habilitado en config, exige también WSS a la escucha. */
  const serviceOperational = wsListening && (!wssEnabledCfg || wssListening);

  useEffect(() => {
    if (!printersDetailsOpen) return;
    const id = window.setInterval(() => {
      void fetchDashboard("live");
    }, 20_000);
    return () => window.clearInterval(id);
  }, [printersDetailsOpen, fetchDashboard]);

  function requireLineSaved(line: MappingLineRow): boolean {
    if (!isLineDirty(line, savedLines)) return true;
    window.alert("Guardá los cambios de esta línea antes de imprimir.");
    return false;
  }

  async function handleSaveLine(lineId: string) {
    const idx = localLines.findIndex((l) => l.id === lineId);
    const line = localLines[idx];
    if (!line) return;
    if (isTicketNetworkLine(line)) {
      if (!isPlausibleNetworkHost(line.ticketNetworkHost ?? "")) {
        window.alert("Ingresá una dirección IP válida para la impresora en red.");
        return;
      }
    } else if (!line.systemPrinterName.trim()) {
      window.alert("Seleccioná una impresora del SO en esta línea.");
      return;
    }
    if (!line.displayLabel?.trim()) {
      window.alert("Completá el alias de la línea.");
      return;
    }
    setLineSaveBusyId(lineId);
    try {
      await invoke("upsert_mapping_line", {
        line: lineToSavePayload(line, idx >= 0 ? idx : line.sortOrder),
      });
      await fetchDashboard("full");
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : String(e);
      if (msg.includes("display_label_alias_duplicate")) {
        window.alert("Ese alias ya está en uso en otra línea.");
      } else if (msg.includes("ticket_network_host_required")) {
        window.alert("Ingresá la dirección IP de la impresora en red.");
      } else if (msg.includes("systemPrinterName")) {
        window.alert("Seleccioná una impresora del SO en esta línea.");
      } else {
        window.alert("No se pudo guardar la línea.");
      }
    } finally {
      setLineSaveBusyId(null);
    }
  }

  async function handleSaveSettings(): Promise<boolean> {
    const agentName = settings.agentDisplayName.trim();
    if (!agentName) {
      window.alert("El nombre del agente de impresión es obligatorio.");
      return false;
    }
    const patch = {
      listenPort: settings.listenPort ? Number(settings.listenPort) : undefined,
      wssListenPort: settings.wssListenPort ? Number(settings.wssListenPort) : undefined,
      wssEnabled: settings.wssEnabled,
      agentDisplayName: agentName,
    };
    setSettingsSaveBusy(true);
    try {
      await invoke("set_service_settings", { patch });
      setConfigEdit(false);
      await fetchDashboard("full");
      return true;
    } catch {
      window.alert("No se pudo guardar la configuración.");
      return false;
    } finally {
      setSettingsSaveBusy(false);
    }
  }

  async function handleConfigToolbarClick() {
    if (settingsSaveBusy) return;
    if (configEdit) {
      await handleSaveSettings();
    } else {
      setConfigEdit(true);
    }
  }

  async function handleRefreshPrinters() {
    if (printersRefreshBusy) return;
    setPrintersRefreshBusy(true);
    try {
      const d = (await invoke("get_dashboard")) as DashboardPayload;
      setDashboard((prev) => ({
        ...(prev ?? {}),
        printers: d.printers,
        printerHealth: d.printerHealth,
        hostPlatform: d.hostPlatform ?? prev?.hostPlatform,
        sumatra: d.sumatra ?? prev?.sumatra,
      }));
    } catch {
      window.alert("No se pudo actualizar la lista de impresoras del sistema.");
    } finally {
      setPrintersRefreshBusy(false);
    }
  }

  async function handleRefreshSumatra() {
    if (sumatraRefreshBusy) return;
    setSumatraRefreshBusy(true);
    try {
      const status = (await invoke("refresh_sumatra_status")) as SumatraStatus;
      setDashboard((prev) => ({ ...(prev ?? {}), sumatra: status }));
    } catch {
      window.alert("No se pudo comprobar SumatraPDF.");
    } finally {
      setSumatraRefreshBusy(false);
    }
  }

  async function handleInstallWssCertificate() {
    setWssCertDialog({
      open: true,
      title: "Certificado WSS",
      message: "Instalando certificado en el almacén de confianza del usuario…",
      variant: "success",
    });
    try {
      const msg = String(await invoke("install_wss_trust_certificate"));
      setWssCertDialog({
        open: true,
        title: "Certificado instalado",
        message: msg,
        variant: "success",
      });
      await fetchDashboard("live");
    } catch (e) {
      setWssCertDialog({
        open: true,
        title: "No se pudo instalar",
        message: String(e),
        variant: "error",
      });
    }
  }

  async function handleLineNetworkProbe(line: MappingLineRow) {
    if (!isTicketNetworkLine(line)) return;
    const networkHost = line.ticketNetworkHost?.trim() ?? "";
    if (!isPlausibleNetworkHost(networkHost)) {
      window.alert("Ingresá una dirección IP válida para probar la conexión.");
      return;
    }
    setNetworkProbeBusyId(line.id);
    try {
      const msg = (await invoke("probe_ticket_network_printer", {
        ticketNetworkHost: networkHost,
      })) as string;
      window.alert(msg);
      await fetchDashboard("live");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo conectar a la impresora en red.";
      window.alert(msg);
      await fetchDashboard("live");
    } finally {
      setNetworkProbeBusyId(null);
    }
  }

  async function handleLineTestCut(line: MappingLineRow) {
    if (line.purpose !== "tickets") return;
    if (!requireLineSaved(line)) return;
    const network = isTicketNetworkLine(line);
    const printer = line.systemPrinterName.trim();
    const networkHost = line.ticketNetworkHost?.trim() ?? "";
    if (network) {
      if (!isPlausibleNetworkHost(networkHost)) {
        window.alert("Ingresá una dirección IP válida para probar el corte.");
        return;
      }
    } else if (!printer) {
      window.alert("Seleccioná una impresora del sistema para probar el corte.");
      return;
    }
    setCutTestBusyId(line.id);
    try {
      await invoke("queue_test_cut_print", {
        systemPrinterName: network ? null : printer,
        ticketNetworkHost: network ? networkHost : null,
      });
      await fetchDashboard("live");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo encolar la prueba de corte.";
      window.alert(msg);
    } finally {
      setCutTestBusyId(null);
    }
  }

  async function handleLineTestDrawer(line: MappingLineRow) {
    if (line.purpose !== "tickets") return;
    if (!requireLineSaved(line)) return;
    const network = isTicketNetworkLine(line);
    const printer = line.systemPrinterName.trim();
    const networkHost = line.ticketNetworkHost?.trim() ?? "";
    if (network) {
      if (!isPlausibleNetworkHost(networkHost)) {
        window.alert("Ingresá una dirección IP válida para probar la gaveta.");
        return;
      }
    } else if (!printer) {
      window.alert("Seleccioná una impresora del sistema para probar la gaveta.");
      return;
    }
    setDrawerTestBusyId(line.id);
    try {
      await invoke("queue_test_drawer_print", {
        systemPrinterName: network ? null : printer,
        ticketNetworkHost: network ? networkHost : null,
      });
      await fetchDashboard("live");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo encolar la prueba de gaveta.";
      window.alert(msg);
    } finally {
      setDrawerTestBusyId(null);
    }
  }

  async function handleLineDocumentPrintTest(line: MappingLineRow) {
    if (!requireLineSaved(line)) return;
    const purpose = line.purpose;
    if (purpose !== "documents" && purpose !== "labels") return;
    const printer = line.systemPrinterName.trim();
    if (!printer) {
      window.alert("Seleccioná una impresora del sistema para la prueba de impresión.");
      return;
    }
    setDocumentPrintTestBusyId(line.id);
    try {
      await invoke("queue_test_print", {
        purpose,
        systemPrinterName: printer,
      });
      await fetchDashboard("live");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo encolar la prueba de impresión.";
      window.alert(msg);
    } finally {
      setDocumentPrintTestBusyId(null);
    }
  }

  async function handleLinePrintTest(line: MappingLineRow) {
    if (line.purpose === "tickets") {
      await handleLineEscposQa(line);
      return;
    }
    if (line.purpose === "documents" || line.purpose === "labels") {
      await handleLineDocumentPrintTest(line);
    }
  }

  async function handleLineEscposQa(line: MappingLineRow) {
    if (!requireLineSaved(line)) return;
    const network = isTicketNetworkLine(line);
    const printer = line.systemPrinterName.trim();
    const networkHost = line.ticketNetworkHost?.trim() ?? "";
    if (network) {
      if (!isPlausibleNetworkHost(networkHost)) {
        window.alert("Ingresá una dirección IP válida para la prueba ESC/POS.");
        return;
      }
    } else if (!printer) {
      window.alert("Seleccioná una impresora del sistema para la prueba ESC/POS.");
      return;
    }
    if (line.purpose !== "tickets") {
      return;
    }
    setEscposQaBusyId(line.id);
    try {
      const includeLogo =
        line.ticketLogoEnabled === true && Boolean(line.ticketLogoPath?.trim());
      await invoke("queue_escpos_qa_print", {
        systemPrinterName: network ? null : printer,
        ticketNetworkHost: network ? networkHost : null,
        purpose: line.purpose,
        includeLogo,
        includeCut: line.autoCutEnabled !== false,
        ticketLogoPath: includeLogo ? line.ticketLogoPath : null,
      });
      await fetchDashboard("live");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo encolar la prueba ESC/POS.";
      window.alert(msg);
    } finally {
      setEscposQaBusyId(null);
    }
  }

  async function handlePickTicketLogo(line: MappingLineRow) {
    if (line.ticketLogoEnabled !== true) return;
    try {
      const result = (await invoke("pick_and_store_ticket_logo", { lineId: line.id })) as {
        ticketLogoPath: string;
        displayName: string;
      };
      setLocalLines((rows) =>
        rows.map((r) =>
          r.id === line.id
            ? {
                ...r,
                ticketLogoPath: result.ticketLogoPath,
                ticketLogoDisplayName: result.displayName,
              }
            : r,
        ),
      );
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : String(e);
      if (msg === "cancelled") return;
      window.alert(msg || "No se pudo seleccionar el logo.");
    }
  }

  async function handleClearTicketLogo(line: MappingLineRow) {
    if (line.ticketLogoEnabled !== true) return;
    try {
      await invoke("clear_ticket_logo", {
        lineId: line.id,
        ticketLogoPath: line.ticketLogoPath ?? null,
      });
      setLocalLines((rows) =>
        rows.map((r) =>
          r.id === line.id
            ? { ...r, ticketLogoPath: undefined, ticketLogoDisplayName: undefined }
            : r,
        ),
      );
    } catch (e: unknown) {
      window.alert(typeof e === "string" ? e : "No se pudo quitar el logo.");
    }
  }

  async function handleRemoveLine(lineId: string) {
    const wasSaved = savedLines.some((l) => l.id === lineId);
    if (wasSaved && !window.confirm("¿Eliminar esta línea de impresora?")) return;
    if (wasSaved) {
      try {
        await invoke("delete_mapping_line", { lineId });
      } catch {
        window.alert("No se pudo eliminar la línea.");
        return;
      }
    }
    setLocalLines((prev) => prev.filter((l) => l.id !== lineId));
    setSavedLines((prev) => prev.filter((l) => l.id !== lineId));
    if (expandedLineId === lineId) setExpandedLineId(null);
    if (wasSaved) await fetchDashboard("full");
  }

  function addMappingLine() {
    const id = newLineId();
    setLocalLines((prev) => [
      ...prev,
      {
        id,
        purpose: DEFAULT_PURPOSE,
        systemPrinterName: "",
        ticketPrinterType: "system",
        sortOrder: prev.length,
        autoCutEnabled: true,
        ticketLogoEnabled: false,
      },
    ]);
    setExpandedLineId(id);
  }

  function updateLine(lineId: string, patch: Partial<MappingLineRow>) {
    setLocalLines((rows) =>
      rows.map((r) => (r.id === lineId ? { ...r, ...patch } : r)),
    );
  }

  function toggleLineExpanded(lineId: string) {
    setExpandedLineId((current) => (current === lineId ? null : lineId));
  }

  async function handleCancelJob(jobId: string | undefined) {
    if (!jobId) return;
    try {
      await invoke("cancel_print_job", { job_id: jobId });
      await fetchDashboard("live");
    } catch {}
  }

  async function handleCancelAllJobs() {
    if (jobs.length === 0) return;
    const n = jobs.length;
    if (!window.confirm(`¿Quitar los ${n} trabajos de la cola?`)) return;
    try {
      await invoke<void>("cancel_all_print_jobs", {});
      await fetchDashboard("full");
    } catch {
      window.alert("No se pudieron quitar todos los trabajos.");
    }
  }

  async function togglePrintNetwork() {
    if (networkBusy) return;
    setNetworkBusy(true);
    try {
      if (serviceOperational) {
        await invoke("stop_print_network");
      } else {
        await invoke("start_print_network");
      }
      await fetchDashboard("full");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "Error desconocido";
      window.alert(`No se pudo cambiar el servicio de impresión (WS/WSS).\n\n${msg}`);
    } finally {
      setNetworkBusy(false);
    }
  }

  return (
    <>
      <header className="print-top-bar" aria-label="Estado del servicio de impresión">
        <div className="mx-auto flex h-full max-w-[400px] min-w-0 items-center gap-2 px-3">
          <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight">
            Estado del servicio de impresión
          </span>
          <IconButton
            type="button"
            icon="Power"
            variant="ghost"
            size="sm"
            disabled={networkBusy}
            title={
              serviceOperational
                ? "Servicio activo (WS/WSS según configuración) — clic para apagar"
                : "Servicio detenido — clic para iniciar"
            }
            ariaLabel={
              serviceOperational ? "Apagar servicio de impresión (WS/WSS)" : "Encender servicio de impresión (WS/WSS)"
            }
            className={`shrink-0 ${
              serviceOperational
                ? "text-success! hover:text-success! hover:bg-transparent!"
                : "text-error! hover:text-error! hover:bg-transparent!"
            }`}
            onClick={() => void togglePrintNetwork()}
          />
        </div>
      </header>

      <main className="print-app-main relative mx-auto max-w-[400px] min-w-0">
      <div className="min-w-0 divide-y divide-border *:min-w-0 *:max-w-full *:px-1">
        <details className="print-acc min-w-0 max-w-full overflow-hidden py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="text-sm">Apps conectadas</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">{sessions.length}</span>
        </summary>
        {sessions.length > 0 ? (
          <div className="max-h-48 space-y-2 overflow-y-auto py-2">
            {sessions.map((s) => (
              <ConnectedSessionCard key={s.connectionId ?? s.clientId} session={s} />
            ))}
          </div>
        ) : null}
      </details>

      <details
        className="print-acc min-w-0 max-w-full overflow-hidden py-3"
        open={configDetailsOpen}
        onToggle={(e) => setConfigDetailsOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">Configuración</span>
          {configDetailsOpen ? (
            <IconButton
              type="button"
              icon={configEdit ? "Save" : "Pencil"}
              variant="basicSecondary"
              size="xs"
              className="shrink-0"
              ariaLabel={configEdit ? "Guardar configuración" : "Editar configuración"}
              disabled={settingsSaveBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfigToolbarClick();
              }}
            />
          ) : null}
        </summary>
        <div className="space-y-3 py-2">
          <SharedTextField
            label="Nombre del agente de impresión"
            name="agent-display-name"
            type="text"
            density="compact"
            labelLayout="inline"
            required
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.agentDisplayName}
            onChange={(e) => setSettings((s) => ({ ...s, agentDisplayName: e.target.value }))}
          />
          <SharedTextField
            label="Puerto WS"
            name="in-ws-port"
            type="number"
            density="compact"
            labelLayout="inline"
            min={1}
            max={65535}
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.listenPort}
            onChange={(e) => setSettings((s) => ({ ...s, listenPort: e.target.value }))}
          />
          <SharedTextField
            label="Puerto WSS"
            name="in-wss-port"
            type="number"
            density="compact"
            labelLayout="inline"
            min={1}
            max={65535}
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.wssListenPort}
            onChange={(e) => setSettings((s) => ({ ...s, wssListenPort: e.target.value }))}
          />
          <InlineSwitchField
            label="WSS habilitado"
            disabled={!configEdit}
            checked={settings.wssEnabled}
            onChange={(wssEnabled) => setSettings((s) => ({ ...s, wssEnabled }))}
            data-test-id="config-wss-enabled"
          />
          {settings.wssEnabled ? (
            <div className="space-y-2 rounded-md border border-border bg-neutral/30 p-3 text-xs text-muted-foreground">
              <p>
                El POS en HTTPS (<code className="text-foreground">wss://127.0.0.1</code>) debe confiar el
                certificado local. Si ves <strong className="text-foreground">CertificateUnknown</strong> en el
                registro, instalá el certificado y reiniciá el navegador del POS.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent/40"
                  onClick={() => void handleInstallWssCertificate()}
                >
                  Confiar certificado WSS
                </button>
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent/40"
                  onClick={() => void invoke("open_app_data_dir").catch(() => {})}
                >
                  Abrir carpeta del certificado
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </details>

      <details
        className="print-acc min-w-0 max-w-full overflow-hidden py-3"
        open={printersDetailsOpen}
        onToggle={(e) => setPrintersDetailsOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">Impresoras</span>
          {printersDetailsOpen ? (
            <>
              <IconButton
                type="button"
                icon="RefreshCw"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                disabled={printersRefreshBusy}
                isLoading={printersRefreshBusy}
                ariaLabel="Actualizar lista de impresoras del sistema"
                title="Actualizar impresoras del sistema"
                onClick={(e) => {
                  e.preventDefault();
                  void handleRefreshPrinters();
                }}
              />
              <IconButton
                type="button"
                icon="Plus"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                ariaLabel="Agregar línea"
                onClick={(e) => {
                  e.preventDefault();
                  addMappingLine();
                }}
              />
            </>
          ) : null}
        </summary>
        <div className="space-y-3 py-2">
          {isWindows && !sumatra?.installed ? (
            <div className="space-y-2 rounded-md border border-border bg-neutral/30 p-3 text-xs text-muted-foreground">
              <p>
                En Windows, los PDF se imprimen en silencio con{" "}
                <strong className="text-foreground">SumatraPDF.exe</strong> en la misma carpeta que
                KaiPrinters o empaquetado en el instalador.
              </p>
              <p className="font-medium text-error">
                SumatraPDF no detectado. Colocá <code className="text-foreground">SumatraPDF.exe</code> junto a{" "}
                <code className="text-foreground">KaiPrinters.exe</code> o definí{" "}
                <code className="text-foreground">KAI_PRINTERS_SUMATRA</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent/40 disabled:opacity-50"
                  disabled={sumatraRefreshBusy}
                  onClick={() => void handleRefreshSumatra()}
                >
                  {sumatraRefreshBusy ? "Comprobando…" : "Comprobar de nuevo"}
                </button>
              </div>
            </div>
          ) : null}
          {localLines.length > 0 ? (
            <div className="divide-y divide-border">
              {localLines.map((line, idx) => (
                <PrinterMappingLineCard
                  key={line.id}
                  line={line}
                  savedLines={savedLines}
                  printers={printers}
                  healthLines={mappingLineHealth}
                  expanded={expandedLineId === line.id}
                  sortOrder={idx}
                  saveBusy={lineSaveBusyId === line.id}
                  printBusy={
                    line.purpose === "tickets"
                      ? escposQaBusyId === line.id
                      : documentPrintTestBusyId === line.id
                  }
                  cutBusy={cutTestBusyId === line.id}
                  drawerTestBusy={drawerTestBusyId === line.id}
                  networkProbeBusy={networkProbeBusyId === line.id}
                  onNetworkProbe={
                    isTicketNetworkLine(line) ? () => void handleLineNetworkProbe(line) : undefined
                  }
                  onToggleExpand={() => toggleLineExpanded(line.id)}
                  onChange={(patch) => updateLine(line.id, patch)}
                  onSave={() => void handleSaveLine(line.id)}
                  onDelete={() => void handleRemoveLine(line.id)}
                  onPrintTest={() => void handleLinePrintTest(line)}
                  onCutTest={() => void handleLineTestCut(line)}
                  onDrawerTest={() => void handleLineTestDrawer(line)}
                  onPickLogo={() => void handlePickTicketLogo(line)}
                  onClearLogo={() => void handleClearTicketLogo(line)}
                  logoBasename={logoBasename}
                />
              ))}
            </div>
          ) : null}
        </div>
      </details>

      <details className="print-acc print-acc--queue min-w-0 max-w-full py-3">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 text-sm">Cola</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-xs font-normal text-muted-foreground">{jobs.length}</span>
            {jobs.length > 0 ? (
              <IconButton
                type="button"
                icon="Trash2"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                ariaLabel="Quitar todos los trabajos de la cola"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCancelAllJobs();
                }}
              />
            ) : null}
          </span>
        </summary>
        <div className="print-queue-scroll min-w-0 w-full py-2">
          <table className="print-queue-table border-collapse text-[0.7rem]">
            <thead>
              <tr className="border-b border-border bg-neutral/50">
                <th
                  scope="col"
                  className="print-queue-sticky-col sticky left-0 z-41 min-w-11 border-border border-r bg-neutral/50 px-1 py-1.5 text-center font-semibold shadow-[4px_0_10px_-3px_rgb(0_0_0/0.12)]"
                >
                  <span className="sr-only">Eliminar</span>
                </th>
                <th className="min-w-[4.5rem] whitespace-nowrap p-1.5 text-left font-semibold">Estado</th>
                <th className="min-w-[12rem] p-1.5 text-left font-semibold">Error</th>
                <th className="min-w-[5rem] whitespace-nowrap p-1.5 text-left font-semibold">Doc</th>
                <th className="min-w-[5.5rem] whitespace-nowrap p-1.5 text-left font-semibold">Folio</th>
                <th className="min-w-[5rem] whitespace-nowrap p-1.5 text-left font-semibold">App</th>
                <th className="min-w-[6rem] whitespace-nowrap p-1.5 text-left font-semibold">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border-b border-border p-2 text-muted-foreground">
                    Sin pendientes ni errores.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id ?? `${j.createdAt}-${j.filename}`} className="border-b border-border last:border-b-0">
                    <td className="print-queue-sticky-col sticky left-0 z-40 min-w-11 border-border border-r bg-background px-0.5 py-1.5 align-middle shadow-[4px_0_10px_-3px_rgb(0_0_0/0.12)]">
                      <div className="flex justify-center">
                        {j.id ? (
                          <IconButton
                            type="button"
                            icon="Trash2"
                            variant="basicSecondary"
                            size="xs"
                            ariaLabel="Quitar trabajo de la cola"
                            onClick={() => void handleCancelJob(j.id)}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-1.5 align-top">
                      <code className="print-code text-[0.65rem]">{escapeHtml(j.status)}</code>
                    </td>
                    <td
                      className="min-w-[12rem] max-w-[20rem] p-1.5 align-top text-error"
                      title={escapeHtml(j.error || "")}
                    >
                      {j.status === "error" && j.error ? (
                        <span className="whitespace-pre-wrap break-words text-[0.65rem]">
                          {escapeHtml(j.error)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="min-w-[5rem] whitespace-nowrap p-1.5 align-top" title={escapeHtml(j.documentType || j.filename || "")}>
                      {escapeHtml(j.documentType || j.filename || "—")}
                    </td>
                    <td className="min-w-[5.5rem] whitespace-nowrap p-1.5 align-top">{escapeHtml(j.internalFolio || "—")}</td>
                    <td className="min-w-[5rem] whitespace-nowrap p-1.5 align-top">{escapeHtml(j.sourceApp || "—")}</td>
                    <td className="min-w-[6rem] whitespace-nowrap p-1.5 align-top">{escapeHtml(j.requestedBy || "—")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>

      <details className="print-acc min-w-0 max-w-full overflow-hidden py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 text-sm">Registro y errores</span>
        </summary>
        <div className="py-2">
          <AgentLogPanel />
        </div>
      </details>

        <footer className="py-4 text-center text-[0.7rem] text-muted-foreground">
          <img
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-2 h-14 w-14 object-contain"
            aria-hidden
          />
          <p className="font-medium text-foreground">{APP_NAME}{appVersion ? ` ${appVersion}` : ""}</p>
          <p>{APP_COPYRIGHT}</p>
        </footer>
      </div>
      </main>

      <AppDialog
        open={wssCertDialog.open}
        onClose={() => setWssCertDialog((d) => ({ ...d, open: false }))}
        title={wssCertDialog.title}
        actions={
          <Button
            type="button"
            variant="contained-primary"
            density="compact"
            onClick={() => setWssCertDialog((d) => ({ ...d, open: false }))}
          >
            Cerrar
          </Button>
        }
      >
        <p
          className={
            wssCertDialog.variant === "error"
              ? "whitespace-pre-wrap text-error"
              : "whitespace-pre-wrap text-foreground"
          }
        >
          {wssCertDialog.message}
        </p>
        {wssCertDialog.variant === "success" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Windows puede mostrar un diálogo del sistema al confiar el certificado; eso es normal.
          </p>
        ) : null}
      </AppDialog>
    </>
  );
}
