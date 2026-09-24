import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, IconButton, Select, Switch, TextField } from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { toUserMessage } from "@/lib/errors";
import { fetchPrintCompanyHeader } from "@/sections/pos/lib/print-company-header";
import {
  defaultPrintConfig,
  fetchPrintConfig,
  fetchPrintHostInfo,
  fetchPrintPreview,
  fetchSystemPrinters,
  savePrintConfig,
  testPrint,
  type LitePrintConfig,
  type LitePrintHostInfo,
  type LitePrintPreview,
  type LiteSystemPrinter,
} from "../api/lite-print.api";

const PAPER_OPTIONS = [
  { id: "80mm", label: "80 mm" },
  { id: "58mm", label: "58 mm" },
];

const COPIES_OPTIONS = [
  { id: "1", label: "1 copia" },
  { id: "2", label: "2 copias" },
];

const ENCODING_OPTIONS = [
  { id: "cp850", label: "CP850 (Latam)" },
  { id: "cp437", label: "CP437" },
  { id: "utf8", label: "UTF-8" },
];

type PreviewKind = "sale" | "cashOpening" | "cashClosing";

export function SettingsPrintersPage() {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [printers, setPrinters] = useState<LiteSystemPrinter[]>([]);
  const [saved, setSaved] = useState<LitePrintConfig>(defaultPrintConfig());
  const [displayName, setDisplayName] = useState("");
  const [systemPrinterName, setSystemPrinterName] = useState("");
  const [paperProfile, setPaperProfile] = useState("80mm");
  const [autoCutEnabled, setAutoCutEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [autoPrintSale, setAutoPrintSale] = useState(true);
  const [autoPrintCashOpening, setAutoPrintCashOpening] = useState(true);
  const [autoPrintCashClosing, setAutoPrintCashClosing] = useState(true);
  const [saleTicketCopies, setSaleTicketCopies] = useState(1);
  const [ticketFooter, setTicketFooter] = useState("Gracias");
  const [showCompanyRut, setShowCompanyRut] = useState(true);
  const [showCompanyAddress, setShowCompanyAddress] = useState(true);
  const [showCompanyPhone, setShowCompanyPhone] = useState(true);
  const [openCashDrawer, setOpenCashDrawer] = useState(false);
  const [textEncoding, setTextEncoding] = useState("cp850");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [hostInfo, setHostInfo] = useState<LitePrintHostInfo | null>(null);
  const [usbGuideOpen, setUsbGuideOpen] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("sale");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<LitePrintPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const syncFromSaved = useCallback((cfg: LitePrintConfig) => {
    setSaved(cfg);
    setDisplayName(cfg.displayName);
    setSystemPrinterName(cfg.systemPrinterName);
    setPaperProfile(cfg.paperProfile === "58mm" ? "58mm" : "80mm");
    setAutoCutEnabled(cfg.autoCutEnabled !== false);
    setEnabled(cfg.enabled !== false);
    setAutoPrintSale(cfg.autoPrintSale !== false);
    setAutoPrintCashOpening(cfg.autoPrintCashOpening !== false);
    setAutoPrintCashClosing(cfg.autoPrintCashClosing !== false);
    setSaleTicketCopies(cfg.saleTicketCopies >= 2 ? 2 : 1);
    setTicketFooter(cfg.ticketFooter ?? "Gracias");
    setShowCompanyRut(cfg.showCompanyRut !== false);
    setShowCompanyAddress(cfg.showCompanyAddress !== false);
    setShowCompanyPhone(cfg.showCompanyPhone !== false);
    setOpenCashDrawer(cfg.openCashDrawer === true);
    setTextEncoding(cfg.textEncoding || "cp850");
    setCurrencySymbol(cfg.currencySymbol?.trim() || "$");
  }, []);

  const formConfig = useCallback((): LitePrintConfig => {
    return {
      displayName: displayName.trim() || "Ticket caja",
      systemPrinterName: systemPrinterName.trim(),
      paperProfile,
      autoCutEnabled,
      enabled,
      autoPrintSale,
      autoPrintCashOpening,
      autoPrintCashClosing,
      saleTicketCopies: saleTicketCopies >= 2 ? 2 : 1,
      ticketFooter: ticketFooter.trim(),
      showCompanyRut,
      showCompanyAddress,
      showCompanyPhone,
      openCashDrawer,
      textEncoding,
      currencySymbol: currencySymbol.trim() || "$",
    };
  }, [
    displayName,
    systemPrinterName,
    paperProfile,
    autoCutEnabled,
    enabled,
    autoPrintSale,
    autoPrintCashOpening,
    autoPrintCashClosing,
    saleTicketCopies,
    ticketFooter,
    showCompanyRut,
    showCompanyAddress,
    showCompanyPhone,
    openCashDrawer,
    textEncoding,
    currencySymbol,
  ]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void Promise.all([fetchPrintConfig(), fetchSystemPrinters(), fetchPrintHostInfo()])
      .then(([cfg, list, host]) => {
        syncFromSaved(cfg);
        setPrinters(list);
        setHostInfo(host);
      })
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, [syncFromSaved]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!editing) {
      syncFromSaved(saved);
    }
  }, [editing, saved, syncFromSaved]);

  const printerOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [
      { id: "", label: "Predeterminada del sistema" },
    ];
    const seen = new Set<string>([""]);
    if (systemPrinterName && !printers.some((p) => p.name === systemPrinterName)) {
      opts.push({ id: systemPrinterName, label: `${systemPrinterName} (no listada)` });
      seen.add(systemPrinterName);
    }
    for (const p of printers) {
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      const suffix = p.default ? " · predeterminada" : p.online === false ? " · offline" : "";
      opts.push({ id: p.name, label: `${p.name}${suffix}` });
    }
    return opts;
  }, [printers, systemPrinterName]);

  const previewDocOptions = useMemo(() => {
    const opts: Array<{ id: PreviewKind; label: string }> = [];
    if (enabled && autoPrintSale) opts.push({ id: "sale", label: "Ticket de venta" });
    if (enabled && autoPrintCashOpening) {
      opts.push({ id: "cashOpening", label: "Apertura de caja" });
    }
    if (enabled && autoPrintCashClosing) {
      opts.push({ id: "cashClosing", label: "Cierre de caja" });
    }
    return opts;
  }, [enabled, autoPrintSale, autoPrintCashOpening, autoPrintCashClosing]);

  useEffect(() => {
    if (previewDocOptions.length === 0) return;
    if (!previewDocOptions.some((o) => o.id === previewKind)) {
      setPreviewKind(previewDocOptions[0]!.id);
    }
  }, [previewDocOptions, previewKind]);

  async function handleSave() {
    setBusy(true);
    setMsg(null);
    setFormError(null);
    try {
      const next = await savePrintConfig(formConfig());
      syncFromSaved(next);
      setMsg("Configuración de impresión guardada");
      setEditing(false);
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleEditOrSave() {
    setMsg(null);
    setFormError(null);
    if (editing) {
      void handleSave();
      return;
    }
    syncFromSaved(saved);
    setEditing(true);
  }

  async function handleTest() {
    setTestBusy(true);
    setMsg(null);
    setFormError(null);
    try {
      await testPrint();
      setMsg("Página de prueba enviada");
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setTestBusy(false);
    }
  }

  async function handleRefreshPrinters() {
    setRefreshBusy(true);
    setFormError(null);
    try {
      const [list, host] = await Promise.all([fetchSystemPrinters(), fetchPrintHostInfo()]);
      setPrinters(list);
      setHostInfo(host);
      setMsg(
        list.length > 0
          ? `Se encontraron ${list.length} impresora(s)`
          : "No hay impresoras en Linux. Revisa si compartiste el USB con el contenedor.",
      );
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setRefreshBusy(false);
    }
  }

  async function handlePreview() {
    if (previewDocOptions.length === 0) return;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const company = await fetchPrintCompanyHeader();
      const data = await fetchPrintPreview({
        kind: previewKind,
        company,
        config: formConfig(),
      });
      setPreview(data);
      setPreviewOpen(true);
    } catch (e) {
      setPreviewError(toUserMessage(e));
    } finally {
      setPreviewBusy(false);
    }
  }

  const readOnly = !editing;
  const previewCols = preview?.cols ?? (paperProfile === "58mm" ? 32 : 42);
  const isLinux = hostInfo?.os === "linux";
  const linuxSectionTitle = hostInfo?.isCrostini
    ? "Chromebook / Crostini (USB)"
    : "Linux (impresora USB)";

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-1 pb-8"
      data-test-id="settings-printers-page"
    >
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Impresión
        </h1>
      </header>

      <LoadingLine loading={loading} />
      <CoreError message={error} />

      {!loading && !error ? (
        <>
          <section
            className="relative space-y-6 rounded-lg border border-border bg-background p-4 pb-14"
            data-test-id="print-config-section"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Impresora del sistema</h2>
              <IconButton
                icon="Printer"
                variant="action"
                size="sm"
                ariaLabel="Probar impresión"
                title="Probar impresión"
                onClick={() => void handleTest()}
                disabled={busy || testBusy || !saved.enabled}
                isLoading={testBusy}
                data-test-id="print-test"
              />
            </div>

            {formError ? <Alert variant="error">{formError}</Alert> : null}
            {msg ? <Alert variant="success">{msg}</Alert> : null}

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Nombre"
                placeholder="Ticket caja"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                readOnly={readOnly}
                disabled={busy}
              />
              <Select
                label="Impresora del SO"
                options={printerOptions}
                value={systemPrinterName}
                onChange={(id) => setSystemPrinterName(String(id ?? ""))}
                alwaysShowLabel
                disabled={readOnly || busy}
              />
              <Select
                label="Formato de papel"
                options={PAPER_OPTIONS}
                value={paperProfile}
                onChange={(id) => setPaperProfile(String(id ?? "80mm"))}
                alwaysShowLabel
                disabled={readOnly || busy}
              />
              <Select
                label="Codificación"
                options={ENCODING_OPTIONS}
                value={textEncoding}
                onChange={(id) => setTextEncoding(String(id ?? "cp850"))}
                alwaysShowLabel
                disabled={readOnly || busy}
                data-test-id="print-text-encoding"
              />
              <Select
                label="Copias ticket de venta"
                options={COPIES_OPTIONS}
                value={String(saleTicketCopies)}
                onChange={(id) => setSaleTicketCopies(String(id) === "2" ? 2 : 1)}
                alwaysShowLabel
                disabled={readOnly || busy}
                data-test-id="print-sale-copies"
              />
              <TextField
                label="Símbolo de moneda"
                placeholder="$"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value.slice(0, 4))}
                readOnly={readOnly}
                disabled={busy}
                data-test-id="print-currency-symbol"
              />
            </div>

            {isLinux ? (
              <div
                className="space-y-3 rounded-md border border-dashed border-border p-3"
                data-test-id="print-linux-usb-section"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {linuxSectionTitle}
                </h3>
                {printers.length === 0 ? (
                  <Alert variant="warning">
                    No hay impresoras visibles en Linux. En Chromebook debes compartir el
                    dispositivo USB con el entorno Linux antes de elegirlo aquí.
                  </Alert>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUsbGuideOpen(true)}
                    disabled={busy}
                    data-test-id="print-usb-guide"
                  >
                    Guía: compartir impresora USB
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleRefreshPrinters()}
                    disabled={busy || refreshBusy}
                    loading={refreshBusy}
                    data-test-id="print-refresh-printers"
                  >
                    Actualizar lista de impresoras
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Impresión automática
              </h3>
              <div className="flex flex-col gap-3">
                <Switch
                  checked={enabled}
                  onChange={setEnabled}
                  label="Impresión habilitada"
                  labelPosition="right"
                  disabled={readOnly || busy}
                  data-test-id="print-enabled"
                />
                <Switch
                  checked={autoPrintSale}
                  onChange={setAutoPrintSale}
                  label="Ticket de venta"
                  labelPosition="right"
                  disabled={readOnly || busy || !enabled}
                  data-test-id="print-auto-sale"
                />
                <Switch
                  checked={autoPrintCashOpening}
                  onChange={setAutoPrintCashOpening}
                  label="Apertura de caja"
                  labelPosition="right"
                  disabled={readOnly || busy || !enabled}
                  data-test-id="print-auto-opening"
                />
                <Switch
                  checked={autoPrintCashClosing}
                  onChange={setAutoPrintCashClosing}
                  label="Cierre de caja"
                  labelPosition="right"
                  disabled={readOnly || busy || !enabled}
                  data-test-id="print-auto-closing"
                />
                <Switch
                  checked={autoCutEnabled}
                  onChange={setAutoCutEnabled}
                  label="Corte automático"
                  labelPosition="right"
                  disabled={readOnly || busy}
                  data-test-id="print-auto-cut"
                />
                <Switch
                  checked={openCashDrawer}
                  onChange={setOpenCashDrawer}
                  label="Abrir cajón al vender"
                  labelPosition="right"
                  disabled={readOnly || busy || !enabled}
                  data-test-id="print-open-drawer"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Datos de empresa en el ticket
              </h3>
              <div className="flex flex-col gap-3">
                <Switch
                  checked={showCompanyRut}
                  onChange={setShowCompanyRut}
                  label="Mostrar RUT"
                  labelPosition="right"
                  disabled={readOnly || busy}
                  data-test-id="print-show-rut"
                />
                <Switch
                  checked={showCompanyAddress}
                  onChange={setShowCompanyAddress}
                  label="Mostrar dirección"
                  labelPosition="right"
                  disabled={readOnly || busy}
                  data-test-id="print-show-address"
                />
                <Switch
                  checked={showCompanyPhone}
                  onChange={setShowCompanyPhone}
                  label="Mostrar teléfono"
                  labelPosition="right"
                  disabled={readOnly || busy}
                  data-test-id="print-show-phone"
                />
              </div>
            </div>

            <TextField
              label="Pie de ticket"
              placeholder="Gracias"
              value={ticketFooter}
              onChange={(e) => setTicketFooter(e.target.value)}
              readOnly={readOnly}
              disabled={busy}
              data-test-id="print-ticket-footer"
            />

            <div className="absolute bottom-2 right-2">
              <IconButton
                icon={editing ? "Save" : "Pencil"}
                variant="action"
                size="sm"
                ariaLabel={editing ? "Guardar impresión" : "Editar impresión"}
                title={editing ? "Guardar" : "Editar"}
                onClick={toggleEditOrSave}
                disabled={busy}
                isLoading={busy}
                data-test-id="print-edit-save"
              />
            </div>
          </section>

          <section
            className="space-y-3 rounded-lg border border-border bg-background p-4"
            data-test-id="print-preview-section"
          >
            <h2 className="text-sm font-semibold text-foreground">Vista previa</h2>
            <p className="text-xs text-muted-foreground">
              Usa el papel, encoding y opciones actuales del formulario (aunque no estén
              guardadas). Solo documentos con impresión automática activa.
            </p>
            {previewError ? <Alert variant="error">{previewError}</Alert> : null}
            {previewDocOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Activá la impresión y al menos un tipo de documento para previsualizar.
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <Select
                    label="Documento"
                    options={previewDocOptions}
                    value={previewKind}
                    onChange={(id) => setPreviewKind(String(id) as PreviewKind)}
                    alwaysShowLabel
                    data-test-id="print-preview-kind"
                  />
                </div>
                <Button
                  type="button"
                  variant="outlined"
                  loading={previewBusy}
                  onClick={() => void handlePreview()}
                  data-test-id="print-preview-open"
                >
                  Vista previa
                </Button>
              </div>
            )}
          </section>
        </>
      ) : null}

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={preview?.title ?? "Vista previa"}
        data-test-id="print-preview-dialog"
      >
        {preview ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {preview.paperProfile} · {preview.cols} columnas · {preview.textEncoding}
              {preview.copies > 1 ? ` · ${preview.copies} copias` : ""}
              {preview.autoCut ? " · corte" : ""}
              {preview.openCashDrawer ? " · cajón" : ""}
            </p>
            <div className="flex justify-center overflow-x-auto rounded-md bg-neutral-900 p-4">
              <pre
                className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-neutral-100"
                style={{
                  width: `${previewCols}ch`,
                  maxWidth: "100%",
                }}
                data-test-id="print-preview-text"
              >
                {preview.text}
              </pre>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={usbGuideOpen}
        onClose={() => setUsbGuideOpen(false)}
        title={
          hostInfo?.isCrostini
            ? "Compartir impresora USB (Chromebook)"
            : "Compartir impresora USB (Linux)"
        }
        data-test-id="print-usb-guide-dialog"
      >
        <div className="space-y-4 text-sm text-foreground">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Conectá la impresora de tickets por USB. En ChromeOS:{" "}
              <strong>Configuración → Avanzada → Impresión y escaneo → Impresoras</strong>{" "}
              (si no aparece como impresora del sistema, seguí al paso 2).
            </li>
            <li>
              En ChromeOS:{" "}
              <strong>
                Configuración → Avanzada → Desarrolladores → Entorno de desarrollo de Linux →
                Dispositivos USB
              </strong>
              . Activá el interruptor de la impresora para compartirla con Linux.
            </li>
            <li>
              Volvé a Lite, pulsá <strong>Actualizar lista de impresoras</strong> y elegí la cola
              en <strong>Impresora del SO</strong>. Lite imprime vía CUPS (`lp`).
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            ChromeOS no permite a la app abrir ese panel automáticamente: el permiso USB se
            otorga solo desde Configuración del Chromebook.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setUsbGuideOpen(false);
                void handleRefreshPrinters();
              }}
              data-test-id="print-usb-guide-refresh"
            >
              Actualizar impresoras
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
