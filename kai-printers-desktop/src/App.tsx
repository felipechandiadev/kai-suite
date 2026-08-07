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

const APP_NAME = "Kai Printers";
const DEFAULT_AGENT_DISPLAY_NAME = APP_NAME;
const APP_COPYRIGHT = "Kai © 2026";

function normalizeAgentDisplayName(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  return t || DEFAULT_AGENT_DISPLAY_NAME;
}

type KaiLoginCompany = {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
};

type PendingKaiLogin = {
  userId: string;
  companies: KaiLoginCompany[];
  selectedCompanyId: string;
};

function companyLabel(c: KaiLoginCompany): string {
  const fantasy = (c.nombreFantasia ?? "").trim();
  return fantasy || c.razonSocial || c.id;
}

const DEFAULT_KAI_CORE_URL = "http://localhost:5180";

async function readHttpErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[]; error?: string };
    if (Array.isArray(body.message)) {
      return body.message.filter(Boolean).join("; ") || fallback;
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error.trim();
    }
  } catch {
    /* ignore parse errors */
  }
  return fallback;
}

/** WebKit/Tauri suele decir "Load failed" si Core no responde (URL/puerto mal). */
function formatKaiCoreNetworkError(err: unknown, baseUrl: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    const base = baseUrl.trim().replace(/\/+$/, "") || DEFAULT_KAI_CORE_URL;
    return `No se pudo conectar a Kai Core (${base}). Revisá la URL (ej. http://localhost:5360 para demo, :5560 para mias) y que el backend esté levantado.`;
  }
  return raw;
}

async function pingKaiCore(base: string): Promise<void> {
  const res = await fetch(`${base}/api/health`, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `Kai Core no respondió correctamente (HTTP ${res.status}). Revisá la URL del tenant.`,
    );
  }
}

type KaiLoginPayload = {
  success?: boolean;
  message?: string;
  user?: { id?: string; rol?: string };
  activeCompanyId?: string | null;
  companies?: KaiLoginCompany[] | null;
  memberships?: Array<{
    companyId: string;
    roles?: string[];
    isOwner?: boolean;
  }>;
};

const KAI_ADMIN_ROLES = new Set(["ADMIN", "SUB_ADMIN", "SUPER_ADMIN"]);

function userCanCreatePrintAgent(
  login: KaiLoginPayload,
  companyId: string,
): boolean {
  const legacyRol = (login.user?.rol ?? "").trim().toUpperCase();
  if (legacyRol === "SUPER_ADMIN" || legacyRol === "ADMIN") return true;
  const mem = login.memberships?.find((m) => m.companyId === companyId);
  if (!mem) return false;
  if (mem.isOwner) return true;
  return (mem.roles ?? []).some((r) =>
    KAI_ADMIN_ROLES.has(String(r).trim().toUpperCase()),
  );
}

function assertKaiAdminForPrintAgent(
  login: KaiLoginPayload,
  companyId: string,
): void {
  if (!userCanCreatePrintAgent(login, companyId)) {
    throw new Error(
      "Se necesita un usuario administrador de la empresa para crear el agente de impresión.",
    );
  }
}

const VALID_PURPOSES = ["tickets", "documents", "labels", "comandas"] as const;
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
  kaiCore?: {
    baseUrl?: string;
    agentId?: string;
    paired?: boolean;
    lanHost?: string | null;
    token?: string | null;
  };
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
  globalTicketLogoPath?: string;
  globalTicketLogoDisplayName?: string;
  ticketShowCompanyRut?: boolean;
  ticketShowRazonSocial?: boolean;
  ticketHeaderTitleMode?: "fantasy" | "branch";
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
    ticketShowCompanyRut: true,
    ticketShowRazonSocial: true,
    ticketHeaderTitleMode: "fantasy" as "fantasy" | "branch",
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
  const [deleteLineDialog, setDeleteLineDialog] = useState<{
    lineId: string;
    alias: string;
  } | null>(null);
  const [deleteLineBusy, setDeleteLineBusy] = useState(false);

  /** Solo mostramos acciones en la fila del summary cuando el `<details>` está expandido */
  const [configDetailsOpen, setConfigDetailsOpen] = useState(false);
  const [printersDetailsOpen, setPrintersDetailsOpen] = useState(false);
  const [globalLogoBusy, setGlobalLogoBusy] = useState(false);
  const [kaiCoreUrl, setKaiCoreUrl] = useState(DEFAULT_KAI_CORE_URL);
  const [kaiLoginUser, setKaiLoginUser] = useState("");
  const [kaiLoginPass, setKaiLoginPass] = useState("");
  const [kaiPendingLogin, setKaiPendingLogin] = useState<PendingKaiLogin | null>(null);
  const [kaiPairAdvancedOpen, setKaiPairAdvancedOpen] = useState(false);
  const [kaiPairToken, setKaiPairToken] = useState("");
  const [kaiCoreBusy, setKaiCoreBusy] = useState(false);
  const [kaiCoreMsg, setKaiCoreMsg] = useState<string | null>(null);
  const [kaiCorePaired, setKaiCorePaired] = useState(false);

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
      ticketShowCompanyRut: d.ticketShowCompanyRut !== false,
      ticketShowRazonSocial: d.ticketShowRazonSocial !== false,
      ticketHeaderTitleMode: d.ticketHeaderTitleMode === "branch" ? "branch" : "fantasy",
    });
    const storedCoreUrl = (d.kaiCore?.baseUrl ?? "").trim().replace(/\/+$/, "");
    const legacyCoreDefault = "http://localhost:5160";
    if (storedCoreUrl && !(storedCoreUrl === legacyCoreDefault && !d.kaiCore?.paired)) {
      setKaiCoreUrl(storedCoreUrl);
    } else if (!d.kaiCore?.paired) {
      setKaiCoreUrl(DEFAULT_KAI_CORE_URL);
      if (storedCoreUrl === legacyCoreDefault) {
        void invoke("set_kai_core_base_url", { baseUrl: DEFAULT_KAI_CORE_URL });
      }
    }
    setKaiCorePaired(!!d.kaiCore?.paired);
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

  /** Heartbeat a Kai Core (catálogo); la impresión sigue por WS local. */
  useEffect(() => {
    if (!kaiCorePaired) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const prep = (await invoke("prepare_kai_core_heartbeat")) as {
          url: string;
          token: string;
          body: Record<string, unknown>;
        };
        const res = await fetch(prep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Print-Agent-Token": prep.token,
          },
          body: JSON.stringify(prep.body),
        });
        if (cancelled) return;
        if (!res.ok) {
          setKaiCoreMsg(
            await readHttpErrorMessage(
              res,
              `Heartbeat Core: HTTP ${res.status}`,
            ),
          );
          return;
        }
        setKaiCoreMsg((prev) =>
          prev?.startsWith("Heartbeat") || prev?.startsWith("No se pudo conectar")
            ? null
            : prev,
        );
      } catch (e) {
        if (!cancelled) {
          setKaiCoreMsg(formatKaiCoreNetworkError(e, kaiCoreUrl));
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [kaiCorePaired, kaiCoreUrl]);

  const completeKaiCorePair = async (pairingToken: string) => {
    const prep = (await invoke("prepare_kai_core_pair", {
      pairingToken: pairingToken.trim(),
    })) as { url: string; body: { pairingToken: string } };
    const res = await fetch(prep.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prep.body),
    });
    if (!res.ok) {
      throw new Error(
        await readHttpErrorMessage(res, `No se pudo emparejar (HTTP ${res.status})`),
      );
    }
    const data = (await res.json()) as {
      id: string;
      pairingToken: string;
      displayName?: string;
    };
    await invoke("save_kai_core_pair", {
      agentId: data.id,
      pairingToken: data.pairingToken ?? prep.body.pairingToken,
    });
    if (data.displayName?.trim()) {
      setSettings((s) => ({ ...s, agentDisplayName: data.displayName!.trim() }));
    }
    setKaiCorePaired(true);
    setKaiPairToken("");
    setKaiLoginPass("");
    setKaiPendingLogin(null);
    setKaiCoreMsg(`Emparejado con Core (${data.displayName ?? data.id})`);
    await fetchDashboard("full");
  };

  const createAgentAndPair = async (userId: string, companyId: string) => {
    const base = kaiCoreUrl.trim().replace(/\/+$/, "");
    const displayName = normalizeAgentDisplayName(settings.agentDisplayName);
    const createRes = await fetch(`${base}/api/print-agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userId}`,
        "X-Active-Company-Id": companyId,
      },
      body: JSON.stringify({ displayName }),
    });
    if (!createRes.ok) {
      const fallback =
        createRes.status === 403
          ? "Se necesita un usuario administrador para crear el agente"
          : `No se pudo crear el agente (HTTP ${createRes.status})`;
      throw new Error(await readHttpErrorMessage(createRes, fallback));
    }
    const created = (await createRes.json()) as {
      id: string;
      pairingToken?: string;
      displayName?: string;
    };
    if (!created.pairingToken?.trim()) {
      throw new Error("Core no devolvió token de emparejamiento");
    }
    await completeKaiCorePair(created.pairingToken);
  };

  const handleKaiCoreLoginPair = async () => {
    setKaiCoreBusy(true);
    setKaiCoreMsg(null);
    try {
      const userName = kaiLoginUser.trim();
      const password = kaiLoginPass;
      if (!userName || !password) {
        throw new Error("Ingresá usuario y contraseña de un administrador");
      }
      if (!normalizeAgentDisplayName(settings.agentDisplayName)) {
        throw new Error("Definí el nombre del agente de impresión");
      }
      await invoke("set_kai_core_base_url", { baseUrl: kaiCoreUrl.trim() });
      const base = kaiCoreUrl.trim().replace(/\/+$/, "");
      await pingKaiCore(base);
      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });
      if (!loginRes.ok) {
        throw new Error(
          await readHttpErrorMessage(
            loginRes,
            loginRes.status === 401
              ? "Usuario o contraseña incorrectos"
              : `Login falló (HTTP ${loginRes.status})`,
          ),
        );
      }
      const login = (await loginRes.json()) as KaiLoginPayload;
      if (!login.success || !login.user?.id) {
        throw new Error(login.message?.trim() || "Usuario o contraseña incorrectos");
      }
      const companies = (login.companies ?? []).filter((c) => c?.id);
      const activeId = (login.activeCompanyId ?? "").trim();
      if (companies.length === 0 && !activeId) {
        throw new Error("El usuario no tiene empresa activa para crear el agente");
      }
      if (companies.length > 1) {
        const selected =
          (activeId && companies.some((c) => c.id === activeId) && activeId) ||
          companies[0]!.id;
        assertKaiAdminForPrintAgent(login, selected);
        setKaiPendingLogin({
          userId: login.user.id,
          companies,
          selectedCompanyId: selected,
        });
        setKaiLoginPass("");
        setKaiCoreMsg("Elegí la empresa y continuá el emparejamiento");
        return;
      }
      const companyId = activeId || companies[0]?.id;
      if (!companyId) {
        throw new Error("No se pudo determinar la empresa activa");
      }
      assertKaiAdminForPrintAgent(login, companyId);
      await createAgentAndPair(login.user.id, companyId);
      setKaiLoginPass("");
    } catch (e) {
      setKaiCoreMsg(formatKaiCoreNetworkError(e, kaiCoreUrl));
    } finally {
      setKaiCoreBusy(false);
    }
  };

  const handleKaiCoreContinueCompany = async () => {
    if (!kaiPendingLogin) return;
    setKaiCoreBusy(true);
    setKaiCoreMsg(null);
    try {
      await invoke("set_kai_core_base_url", { baseUrl: kaiCoreUrl.trim() });
      await createAgentAndPair(
        kaiPendingLogin.userId,
        kaiPendingLogin.selectedCompanyId,
      );
    } catch (e) {
      setKaiCoreMsg(formatKaiCoreNetworkError(e, kaiCoreUrl));
    } finally {
      setKaiCoreBusy(false);
    }
  };

  const handleKaiCorePair = async () => {
    setKaiCoreBusy(true);
    setKaiCoreMsg(null);
    try {
      await invoke("set_kai_core_base_url", { baseUrl: kaiCoreUrl.trim() });
      await completeKaiCorePair(kaiPairToken.trim());
    } catch (e) {
      setKaiCoreMsg(formatKaiCoreNetworkError(e, kaiCoreUrl));
    } finally {
      setKaiCoreBusy(false);
    }
  };

  const handleKaiCoreUnpair = async () => {
    setKaiCoreBusy(true);
    try {
      await invoke("clear_kai_core_pair");
      setKaiCorePaired(false);
      setKaiPendingLogin(null);
      setKaiCoreMsg("Desemparejado de Kai Core");
    } catch (e) {
      setKaiCoreMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setKaiCoreBusy(false);
    }
  };

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
  const globalTicketLogoPath = dashboard?.globalTicketLogoPath;
  const globalTicketLogoDisplayName =
    dashboard?.globalTicketLogoDisplayName ?? logoBasename(globalTicketLogoPath);
  const anyTicketLogoEnabled = localLines.some(
    (l) => l.purpose === "tickets" && l.ticketLogoEnabled === true,
  );
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
      ticketShowCompanyRut: settings.ticketShowCompanyRut,
      ticketShowRazonSocial: settings.ticketShowRazonSocial,
      ticketHeaderTitleMode: settings.ticketHeaderTitleMode,
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
    const purpose = line.purpose;
    if (purpose !== "documents" && purpose !== "labels") return;
    const printer = line.systemPrinterName.trim();
    if (!printer) {
      window.alert("Seleccioná una impresora del sistema para la prueba de impresión.");
      return;
    }
    if (!line.displayLabel?.trim()) {
      window.alert("Completá el alias de la línea antes de imprimir.");
      return;
    }
    setDocumentPrintTestBusyId(line.id);
    try {
      await invoke("queue_test_print", {
        purpose,
        systemPrinterName: printer,
      });
      await fetchDashboard("live");
      window.alert(`Prueba de impresión enviada a «${printer}». Revisá la cola si no imprime.`);
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
    const network = isTicketNetworkLine(line);
    const printer = line.systemPrinterName.trim();
    const networkHost = line.ticketNetworkHost?.trim() ?? "";
    if (!line.displayLabel?.trim()) {
      window.alert("Completá el alias de la línea antes de imprimir.");
      return;
    }
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
      const includeLogo = line.ticketLogoEnabled === true;
      await invoke("queue_escpos_qa_print", {
        systemPrinterName: network ? null : printer,
        ticketNetworkHost: network ? networkHost : null,
        purpose: line.purpose,
        includeLogo,
        includeCut: line.autoCutEnabled !== false,
        paperProfile: normalizePaperProfile(line.purpose, line.paperProfile),
      });
      await fetchDashboard("live");
      window.alert(
        network
          ? `Prueba ESC/POS enviada a ${networkHost}. Revisá la cola si no imprime.`
          : `Prueba ESC/POS enviada a «${printer}». Revisá la cola si no imprime.`,
      );
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

  async function handlePickGlobalTicketLogo() {
    setGlobalLogoBusy(true);
    try {
      const result = (await invoke("pick_and_store_global_ticket_logo")) as {
        ticketLogoPath: string;
        displayName: string;
      };
      setDashboard((d) =>
        d
          ? {
              ...d,
              globalTicketLogoPath: result.ticketLogoPath,
              globalTicketLogoDisplayName: result.displayName,
            }
          : d,
      );
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : String(e);
      if (msg === "cancelled") return;
      window.alert(msg || "No se pudo seleccionar el logo.");
    } finally {
      setGlobalLogoBusy(false);
    }
  }

  async function handleClearGlobalTicketLogo() {
    setGlobalLogoBusy(true);
    try {
      await invoke("clear_global_ticket_logo");
      setDashboard((d) =>
        d
          ? {
              ...d,
              globalTicketLogoPath: undefined,
              globalTicketLogoDisplayName: undefined,
            }
          : d,
      );
    } catch (e: unknown) {
      window.alert(typeof e === "string" ? e : "No se pudo quitar el logo.");
    } finally {
      setGlobalLogoBusy(false);
    }
  }

  function applyLineRemovedLocally(lineId: string) {
    setLocalLines((prev) => prev.filter((l) => l.id !== lineId));
    setSavedLines((prev) => prev.filter((l) => l.id !== lineId));
    setDashboard((d) =>
      d
        ? {
            ...d,
            mappingLines: (d.mappingLines ?? []).filter((row) => String(row?.id) !== lineId),
          }
        : d,
    );
    if (expandedLineId === lineId) setExpandedLineId(null);
  }

  async function removeSavedLineFromDb(lineId: string): Promise<boolean> {
    try {
      const removed = await invoke<boolean>("delete_mapping_line", { lineId });
      if (!removed) {
        window.alert("No se encontró la línea guardada. Se actualizará la lista.");
        await fetchDashboard("full");
        return false;
      }
      return true;
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "No se pudo eliminar la línea.";
      window.alert(msg);
      return false;
    }
  }

  function requestRemoveLine(lineId: string) {
    const wasSaved = savedLines.some((l) => l.id === lineId);
    if (!wasSaved) {
      applyLineRemovedLocally(lineId);
      return;
    }
    const alias = localLines.find((l) => l.id === lineId)?.displayLabel?.trim() || "esta línea";
    setDeleteLineDialog({ lineId, alias });
  }

  async function confirmRemoveLine() {
    if (!deleteLineDialog || deleteLineBusy) return;
    const { lineId } = deleteLineDialog;
    setDeleteLineBusy(true);
    try {
      const ok = await removeSavedLineFromDb(lineId);
      if (!ok) return;
      applyLineRemovedLocally(lineId);
      setDeleteLineDialog(null);
    } finally {
      setDeleteLineBusy(false);
    }
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
          <div className="space-y-2 rounded-md border border-border bg-neutral/20 p-3">
            <p className="text-xs font-semibold text-foreground">Kai Core (catálogo)</p>
            <p className="text-[11px] text-muted-foreground">
              Iniciá sesión con un administrador para registrar este agente. La impresión sigue por
              red local; solo se guarda el token del agente (no tu contraseña). URL típica del
              backend: <code className="text-foreground">http://localhost:PUERTO</code> (ej. 5360
              demo, 5560 mias).
            </p>
            <SharedTextField
              label="URL Kai Core"
              name="kai-core-url"
              type="url"
              density="compact"
              labelLayout="inline"
              readOnly={!configEdit && kaiCorePaired}
              disabled={kaiCoreBusy}
              value={kaiCoreUrl}
              onChange={(e) => setKaiCoreUrl(e.target.value)}
              placeholder={DEFAULT_KAI_CORE_URL}
            />
            {kaiCorePaired ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-foreground">Emparejado</span>
                <button
                  type="button"
                  className="text-xs underline"
                  disabled={kaiCoreBusy}
                  onClick={() => void handleKaiCoreUnpair()}
                >
                  Desemparejar
                </button>
              </div>
            ) : kaiPendingLogin ? (
              <>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  Empresa
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                    disabled={kaiCoreBusy}
                    value={kaiPendingLogin.selectedCompanyId}
                    onChange={(e) =>
                      setKaiPendingLogin((prev) =>
                        prev
                          ? { ...prev, selectedCompanyId: e.target.value }
                          : prev,
                      )
                    }
                  >
                    {kaiPendingLogin.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {companyLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                    disabled={kaiCoreBusy || !kaiPendingLogin.selectedCompanyId}
                    onClick={() => void handleKaiCoreContinueCompany()}
                  >
                    Continuar emparejamiento
                  </button>
                  <button
                    type="button"
                    className="text-xs underline"
                    disabled={kaiCoreBusy}
                    onClick={() => {
                      setKaiPendingLogin(null);
                      setKaiCoreMsg(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <SharedTextField
                  label="Usuario"
                  name="kai-login-user"
                  type="text"
                  density="compact"
                  labelLayout="inline"
                  disabled={kaiCoreBusy}
                  value={kaiLoginUser}
                  onChange={(e) => setKaiLoginUser(e.target.value)}
                  autoComplete="username"
                />
                <SharedTextField
                  label="Contraseña"
                  name="kai-login-pass"
                  type="password"
                  density="compact"
                  labelLayout="inline"
                  disabled={kaiCoreBusy}
                  value={kaiLoginPass}
                  onChange={(e) => setKaiLoginPass(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                  disabled={
                    kaiCoreBusy ||
                    !kaiLoginUser.trim() ||
                    !kaiLoginPass ||
                    !kaiCoreUrl.trim()
                  }
                  onClick={() => void handleKaiCoreLoginPair()}
                >
                  Iniciar sesión y emparejar
                </button>
                <details
                  className="rounded-md border border-border/60 bg-background/40 p-2"
                  open={kaiPairAdvancedOpen}
                  onToggle={(e) =>
                    setKaiPairAdvancedOpen((e.target as HTMLDetailsElement).open)
                  }
                >
                  <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
                    Avanzado: pegar token de Admin
                  </summary>
                  <div className="mt-2 space-y-2">
                    <SharedTextField
                      label="Token de emparejamiento"
                      name="kai-pair-token"
                      type="text"
                      density="compact"
                      labelLayout="inline"
                      disabled={kaiCoreBusy}
                      value={kaiPairToken}
                      onChange={(e) => setKaiPairToken(e.target.value)}
                      placeholder="Pegá el token de Admin"
                    />
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                      disabled={kaiCoreBusy || kaiPairToken.trim().length < 32}
                      onClick={() => void handleKaiCorePair()}
                    >
                      Emparejar con token
                    </button>
                  </div>
                </details>
              </>
            )}
            {kaiCoreMsg ? (
              <p className="text-[11px] text-muted-foreground">{kaiCoreMsg}</p>
            ) : null}
          </div>
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
                Kai Printers o empaquetado en el instalador.
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
                  onDelete={() => requestRemoveLine(line.id)}
                  onPrintTest={() => void handleLinePrintTest(line)}
                  onCutTest={() => void handleLineTestCut(line)}
                  onDrawerTest={() => void handleLineTestDrawer(line)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </details>

      <details className="print-acc min-w-0 max-w-full py-3">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 text-sm">Logo de tickets</span>
        </summary>
        <div className="min-w-0 space-y-2 py-2">
          <SharedTextField
            label="Imagen"
            name="global-ticket-logo"
            type="text"
            density="compact"
            labelLayout="inline"
            readOnly
            placeholder="Sin logo (PNG/JPG)"
            value={globalTicketLogoDisplayName}
            onChange={() => {}}
            endAdornment={
              <>
                {globalTicketLogoPath ? (
                  <IconButton
                    icon="X"
                    variant="basicSecondary"
                    size="xs"
                    className="min-h-5 min-w-5 p-0"
                    ariaLabel="Quitar logo global"
                    title="Quitar logo"
                    tabIndex={-1}
                    disabled={globalLogoBusy}
                    onClick={() => void handleClearGlobalTicketLogo()}
                  />
                ) : null}
                <IconButton
                  icon="FolderOpen"
                  variant="basicSecondary"
                  size="xs"
                  className="min-h-5 min-w-5 p-0"
                  ariaLabel="Seleccionar imagen de logo global"
                  title="Seleccionar PNG o JPG"
                  tabIndex={-1}
                  disabled={globalLogoBusy}
                  onClick={() => void handlePickGlobalTicketLogo()}
                />
              </>
            }
          />
          {anyTicketLogoEnabled && !globalTicketLogoPath?.trim() ? (
            <p className="text-xs text-muted-foreground">
              Hay líneas con «Imprimir logo» activado sin imagen global: se usará el logo Kai por defecto.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Un solo logo para todas las líneas de tickets. Cada línea activa o desactiva la impresión del logo.
            </p>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">Datos de empresa en tickets</p>
            <p className="text-[11px] text-muted-foreground">
              Define el título grande del encabezado ESC/POS y si se muestran RUT y razón social.
            </p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Título del ticket</p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="ticket-header-title-mode"
                    checked={settings.ticketHeaderTitleMode === "fantasy"}
                    onChange={() => {
                      setSettings((s) => ({ ...s, ticketHeaderTitleMode: "fantasy" }));
                      void invoke("set_service_settings", {
                        patch: { ticketHeaderTitleMode: "fantasy" },
                      }).catch(() => {
                        window.alert("No se pudo guardar el título del ticket.");
                      });
                    }}
                  />
                  Nombre de fantasía
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="ticket-header-title-mode"
                    checked={settings.ticketHeaderTitleMode === "branch"}
                    onChange={() => {
                      setSettings((s) => ({ ...s, ticketHeaderTitleMode: "branch" }));
                      void invoke("set_service_settings", {
                        patch: { ticketHeaderTitleMode: "branch" },
                      }).catch(() => {
                        window.alert("No se pudo guardar el título del ticket.");
                      });
                    }}
                  />
                  Sucursal
                </label>
              </div>
            </div>
            <InlineSwitchField
              label="Mostrar RUT"
              checked={settings.ticketShowCompanyRut}
              onChange={(ticketShowCompanyRut) => {
                setSettings((s) => ({ ...s, ticketShowCompanyRut }));
                void invoke("set_service_settings", { patch: { ticketShowCompanyRut } }).catch(() => {
                  window.alert("No se pudo guardar la preferencia de RUT.");
                });
              }}
            />
            <InlineSwitchField
              label="Mostrar razón social"
              checked={settings.ticketShowRazonSocial}
              onChange={(ticketShowRazonSocial) => {
                setSettings((s) => ({ ...s, ticketShowRazonSocial }));
                void invoke("set_service_settings", { patch: { ticketShowRazonSocial } }).catch(() => {
                  window.alert("No se pudo guardar la preferencia de razón social.");
                });
              }}
            />
          </div>
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
            alt="Kai"
            width={120}
            height={48}
            className="mx-auto mb-2 h-12 w-auto max-w-[7.5rem] object-contain"
            aria-hidden
          />
          <p className="font-medium text-foreground">{APP_NAME}{appVersion ? ` ${appVersion}` : ""}</p>
          <p>{APP_COPYRIGHT}</p>
        </footer>
      </div>
      </main>

      <AppDialog
        open={deleteLineDialog != null}
        onClose={() => {
          if (!deleteLineBusy) setDeleteLineDialog(null);
        }}
        title="Eliminar línea de impresora"
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              density="compact"
              disabled={deleteLineBusy}
              onClick={() => setDeleteLineDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="contained-primary"
              density="compact"
              disabled={deleteLineBusy}
              onClick={() => void confirmRemoveLine()}
            >
              {deleteLineBusy ? "Eliminando…" : "Eliminar"}
            </Button>
          </>
        }
      >
        <p className="text-foreground">
          ¿Eliminar <strong>{deleteLineDialog?.alias}</strong>? Los trabajos en cola que usen este
          alias pueden fallar hasta que configures otra línea.
        </p>
      </AppDialog>

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
