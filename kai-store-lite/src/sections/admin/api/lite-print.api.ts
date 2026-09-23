import { invoke } from "@tauri-apps/api/core";
import type { LitePrintCompanyHeader } from "@/sections/pos/lib/print-company-header";

export type LitePrintConfig = {
  displayName: string;
  systemPrinterName: string;
  paperProfile: "58mm" | "80mm" | string;
  autoCutEnabled: boolean;
  enabled: boolean;
  autoPrintSale: boolean;
  autoPrintCashOpening: boolean;
  autoPrintCashClosing: boolean;
  saleTicketCopies: number;
  ticketFooter: string;
  showCompanyRut: boolean;
  showCompanyAddress: boolean;
  showCompanyPhone: boolean;
  openCashDrawer: boolean;
  textEncoding: "cp850" | "cp437" | "utf8" | string;
};

export type LitePrintPreview = {
  kind: string;
  title: string;
  text: string;
  cols: number;
  paperProfile: string;
  textEncoding: string;
  copies: number;
  autoCut: boolean;
  openCashDrawer: boolean;
};

export type LiteSystemPrinter = {
  name: string;
  default?: boolean;
  online?: boolean;
};

const STORAGE_KEY = "kai-lite.print-config.v1";

export function defaultPrintConfig(): LitePrintConfig {
  return {
    displayName: "Ticket caja",
    systemPrinterName: "",
    paperProfile: "80mm",
    autoCutEnabled: true,
    enabled: true,
    autoPrintSale: true,
    autoPrintCashOpening: true,
    autoPrintCashClosing: true,
    saleTicketCopies: 1,
    ticketFooter: "Gracias",
    showCompanyRut: true,
    showCompanyAddress: true,
    showCompanyPhone: true,
    openCashDrawer: false,
    textEncoding: "cp850",
  };
}

function normalizeEncoding(raw: unknown): string {
  const v = String(raw ?? "cp850").toLowerCase();
  if (v === "cp437" || v === "ibm437") return "cp437";
  if (v === "utf8" || v === "utf-8") return "utf8";
  return "cp850";
}

function normalizeConfig(parsed: Partial<LitePrintConfig>): LitePrintConfig {
  const base = defaultPrintConfig();
  const copies = Number(parsed.saleTicketCopies);
  return {
    ...base,
    ...parsed,
    paperProfile: parsed.paperProfile === "58mm" ? "58mm" : "80mm",
    saleTicketCopies: copies >= 2 ? 2 : 1,
    ticketFooter:
      typeof parsed.ticketFooter === "string" ? parsed.ticketFooter : base.ticketFooter,
    autoPrintSale: parsed.autoPrintSale !== false,
    autoPrintCashOpening: parsed.autoPrintCashOpening !== false,
    autoPrintCashClosing: parsed.autoPrintCashClosing !== false,
    showCompanyRut: parsed.showCompanyRut !== false,
    showCompanyAddress: parsed.showCompanyAddress !== false,
    showCompanyPhone: parsed.showCompanyPhone !== false,
    openCashDrawer: parsed.openCashDrawer === true,
    autoCutEnabled: parsed.autoCutEnabled !== false,
    enabled: parsed.enabled !== false,
    textEncoding: normalizeEncoding(parsed.textEncoding),
  };
}

function readLocalConfig(): LitePrintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrintConfig();
    return normalizeConfig(JSON.parse(raw) as Partial<LitePrintConfig>);
  } catch {
    return defaultPrintConfig();
  }
}

function writeLocalConfig(cfg: LitePrintConfig): LitePrintConfig {
  const next = normalizeConfig({
    ...cfg,
    displayName: cfg.displayName.trim() || "Ticket caja",
    systemPrinterName: cfg.systemPrinterName.trim(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function fetchPrintConfig(): Promise<LitePrintConfig> {
  try {
    return normalizeConfig(await invoke<LitePrintConfig>("print_get_config"));
  } catch {
    return readLocalConfig();
  }
}

export async function savePrintConfig(config: LitePrintConfig): Promise<LitePrintConfig> {
  const payload = normalizeConfig(config);
  try {
    return normalizeConfig(
      await invoke<LitePrintConfig>("print_save_config", { config: payload }),
    );
  } catch {
    return writeLocalConfig(payload);
  }
}

export async function fetchPrintPreview(opts: {
  kind: "sale" | "cashOpening" | "cashClosing";
  company?: LitePrintCompanyHeader;
  config?: LitePrintConfig;
}): Promise<LitePrintPreview> {
  try {
    return await invoke<LitePrintPreview>("print_preview", {
      kind: opts.kind,
      company: opts.company ?? null,
      config: opts.config ?? null,
    });
  } catch (e) {
    // Vite-only fallback: texto mínimo
    const cfg = opts.config ?? readLocalConfig();
    const cols = cfg.paperProfile === "58mm" ? 32 : 42;
    return {
      kind: opts.kind,
      title:
        opts.kind === "sale"
          ? "Ticket de venta"
          : opts.kind === "cashOpening"
            ? "Apertura de caja"
            : "Cierre de caja",
      text: `(Vista previa no disponible fuera de Tauri)\nPapel ${cfg.paperProfile} · ${cols} cols\n`,
      cols,
      paperProfile: cfg.paperProfile,
      textEncoding: cfg.textEncoding,
      copies: opts.kind === "sale" ? cfg.saleTicketCopies : 1,
      autoCut: cfg.autoCutEnabled,
      openCashDrawer: opts.kind === "sale" && cfg.openCashDrawer,
    };
  }
}

export async function fetchPrintSalePreview(opts: {
  saleId: string;
  total: number;
  method: string;
  lines: unknown;
  company?: LitePrintCompanyHeader;
}): Promise<LitePrintPreview> {
  try {
    return await invoke<LitePrintPreview>("print_sale_preview", {
      saleId: opts.saleId,
      total: opts.total,
      method: opts.method,
      lines: opts.lines,
      company: opts.company ?? null,
    });
  } catch {
    const cfg = readLocalConfig();
    const cols = cfg.paperProfile === "58mm" ? 32 : 42;
    return {
      kind: "sale",
      title: "Ticket de venta",
      text: `VENTA ${opts.saleId.slice(-8)}\nTOTAL: ${opts.total}\nPago: ${opts.method}\n`,
      cols,
      paperProfile: cfg.paperProfile,
      textEncoding: cfg.textEncoding,
      copies: cfg.saleTicketCopies,
      autoCut: cfg.autoCutEnabled,
      openCashDrawer: cfg.openCashDrawer,
    };
  }
}

export async function printSaleTicket(opts: {
  saleId: string;
  total: number;
  method: string;
  lines: unknown;
  company?: LitePrintCompanyHeader;
}): Promise<void> {
  await invoke("print_sale_ticket", {
    saleId: opts.saleId,
    total: opts.total,
    method: opts.method,
    lines: opts.lines,
    company: opts.company ?? null,
  });
}

export async function fetchSystemPrinters(): Promise<LiteSystemPrinter[]> {
  try {
    return await invoke<LiteSystemPrinter[]>("print_list_system_printers");
  } catch {
    return [];
  }
}

export async function testPrint(): Promise<void> {
  try {
    await invoke("print_test");
  } catch (e) {
    const cfg = readLocalConfig();
    if (!cfg.enabled) {
      throw new Error("La impresión está deshabilitada");
    }
    if (e instanceof Error && /not allowed|plugin|tauri/i.test(e.message)) {
      return;
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}
