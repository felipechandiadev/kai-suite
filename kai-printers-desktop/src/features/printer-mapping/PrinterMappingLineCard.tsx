import IconButton from "../../shared/components/IconButton/IconButton";
import InlineSwitchField from "../../shared/components/InlineSwitchField";
import { Select } from "../../shared/components/Select";
import SharedTextField from "../../shared/components/TextField/TextField";
import { PrinterStatusDot } from "./PrinterStatusDot";
import {
  isLineDirty,
  isTicketLikePurpose,
  isTicketNetworkLine,
  linePrinterStatus,
} from "./mapping-line-utils";
import {
  isPlausibleNetworkHost,
  TICKET_PRINTER_TYPE_OPTIONS,
  normalizeTicketPrinterType,
} from "./ticket-printer-type";
import {
  DOCUMENT_PAPER_PROFILE_OPTIONS,
  TICKET_PAPER_PROFILE_OPTIONS,
  defaultPaperProfileForPurpose,
  normalizePaperProfile,
} from "./paper-profile-options";
import type { MappingLineRow, MappingLineHealthRow, PrinterRow } from "./types";

const PURPOSES = [
  { id: "tickets", label: "Tickets" },
  { id: "comandas", label: "Comandas" },
  { id: "documents", label: "Documentos" },
  { id: "labels", label: "Etiquetas" },
] as const;

type Props = {
  line: MappingLineRow;
  savedLines: MappingLineRow[];
  printers: PrinterRow[];
  healthLines?: MappingLineHealthRow[];
  expanded: boolean;
  sortOrder: number;
  saveBusy: boolean;
  printBusy: boolean;
  cutBusy: boolean;
  drawerTestBusy?: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<MappingLineRow>) => void;
  onSave: () => void;
  onDelete: () => void;
  onPrintTest: () => void;
  onCutTest: () => void;
  onDrawerTest?: () => void;
  onNetworkProbe?: () => void;
  networkProbeBusy?: boolean;
};

export function PrinterMappingLineCard({
  line,
  savedLines,
  printers,
  healthLines,
  expanded,
  onToggleExpand,
  onChange,
  onSave,
  onDelete,
  onPrintTest,
  onCutTest,
  onDrawerTest,
  drawerTestBusy = false,
  onNetworkProbe,
  networkProbeBusy = false,
  saveBusy,
  printBusy,
  cutBusy,
}: Props) {
  const dirty = isLineDirty(line, savedLines);
  const status = linePrinterStatus(line, printers, healthLines);
  const purposeOpts = PURPOSES.map(({ id, label }) => ({ id, label }));
  const printerOpts: { id: string; label: string }[] = [];
  for (const p of printers) {
    const def = p.default ? " ★" : "";
    const off = p.online === false ? " [off]" : "";
    printerOpts.push({ id: p.name, label: `${p.name}${def}${off}` });
  }
  if (line.systemPrinterName && !printers.some((x) => x.name === line.systemPrinterName)) {
    printerOpts.push({
      id: line.systemPrinterName,
      label: `${line.systemPrinterName} (no listada)`,
    });
  }

  const aliasOk = Boolean(line.displayLabel?.trim());
  const isTickets = line.purpose === "tickets";
  const isTicketLike = isTicketLikePurpose(line.purpose);
  const isDocuments = line.purpose === "documents";
  const isLabels = line.purpose === "labels";
  const paperProfile = normalizePaperProfile(line.purpose, line.paperProfile);
  const paperProfileOpts = isDocuments
    ? DOCUMENT_PAPER_PROFILE_OPTIONS.map(({ id, label }) => ({ id, label }))
    : isTicketLike
      ? TICKET_PAPER_PROFILE_OPTIONS.map(({ id, label }) => ({ id, label }))
      : [];
  const showPrintTest = isTicketLike || isDocuments || isLabels;
  const ticketNetwork = isTicketNetworkLine(line);
  const printerOk = ticketNetwork
    ? isPlausibleNetworkHost(line.ticketNetworkHost ?? "")
    : Boolean(line.systemPrinterName.trim());

  return (
    <div className="py-2">
      <SharedTextField
        label="Alias"
        name={`alias-${line.id}`}
        type="text"
        density="compact"
        labelLayout="inline"
        placeholder="Ej. Tickets caja 1"
        required
        value={line.displayLabel ?? ""}
        onChange={(e) => onChange({ displayLabel: e.target.value })}
        inlineLeadingAdornment={
          <IconButton
            type="button"
            icon="ChevronDown"
            variant="ghost"
            size="xs"
            className={`min-h-5 min-w-5 p-0 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
            ariaLabel={expanded ? "Contraer línea" : "Expandir línea"}
            aria-expanded={expanded}
            onClick={onToggleExpand}
          />
        }
        endAdornment={
          <span className="inline-flex shrink-0 items-center gap-0.5">
            {isTicketLike ? (
              <span
                className="text-[10px] font-medium text-muted-foreground"
                title="Ancho del rollo configurado para esta línea"
              >
                {paperProfile === "58mm" ? "58 mm" : "80 mm"}
              </span>
            ) : null}
            <PrinterStatusDot status={status} />
            <IconButton
              type="button"
              icon="Trash2"
              variant="basicSecondary"
              size="xs"
              className="relative z-30 min-h-6 min-w-6 p-0"
              ariaLabel="Eliminar línea"
              title="Eliminar línea de impresora"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
            <IconButton
              type="button"
              icon="Save"
              variant="basicSecondary"
              size="xs"
              disabled={!dirty || saveBusy || !aliasOk || !printerOk}
              isLoading={saveBusy}
              className="min-h-5 min-w-5 p-0"
              ariaLabel="Guardar esta línea"
              title={dirty ? "Guardar cambios de esta línea" : "Sin cambios"}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            />
            {showPrintTest ? (
              <IconButton
                type="button"
                icon="Printer"
                variant="basicSecondary"
                size="xs"
                disabled={!printerOk || !aliasOk || printBusy}
                isLoading={printBusy}
                className="min-h-5 min-w-5 p-0"
                ariaLabel={
                  isTicketLike ? "Prueba ESC/POS (RAW)" : "Prueba de impresión (PDF)"
                }
                title={
                  !aliasOk
                    ? "Completá el alias antes de imprimir"
                    : !printerOk
                      ? "Seleccioná impresora o IP válida"
                      : isTicketLike
                        ? "Prueba ESC/POS RAW (logo y corte de esta línea)"
                        : isDocuments
                          ? "Prueba PDF en hoja (macOS: CUPS, Windows: SumatraPDF)"
                          : "Prueba PDF de etiqueta"
                }
                data-test-id={
                  isTicketLike ? `line-escpos-qa-${line.id}` : `line-document-test-${line.id}`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onPrintTest();
                }}
              />
            ) : null}
          </span>
        }
      />

      {expanded ? (
        <div className="mt-3 flex flex-col gap-3">
          <Select
            label="Propósito"
            placeholder="Seleccionar"
            density="compact"
            labelLayout="inline"
            value={line.purpose}
            onChange={(id) => {
              const purpose = String(id ?? "tickets");
              if (purpose === "tickets" || purpose === "comandas") {
                onChange({
                  purpose,
                  paperProfile: normalizePaperProfile(purpose, line.paperProfile),
                });
              } else {
                onChange({
                  purpose,
                  ticketPrinterType: undefined,
                  ticketNetworkHost: undefined,
                  paperProfile: defaultPaperProfileForPurpose(purpose),
                });
              }
            }}
            options={purposeOpts}
            name={`purpose-${line.id}`}
          />
          {isTicketLike ? (
            <Select
              label="Tipo"
              placeholder="Seleccionar"
              density="compact"
              labelLayout="inline"
              value={normalizeTicketPrinterType(line.ticketPrinterType)}
              onChange={(id) => {
                const next = normalizeTicketPrinterType(id);
                if (next === "network") {
                  onChange({ ticketPrinterType: "network", systemPrinterName: "" });
                } else {
                  onChange({ ticketPrinterType: "system", ticketNetworkHost: undefined });
                }
              }}
              options={TICKET_PRINTER_TYPE_OPTIONS.map(({ id, label }) => ({ id, label }))}
              name={`ticket-type-${line.id}`}
            />
          ) : null}
          {paperProfileOpts.length > 0 ? (
            <Select
              label="Formato de papel"
              placeholder="Seleccionar"
              density="compact"
              labelLayout="inline"
              value={paperProfile}
              onChange={(id) => onChange({ paperProfile: String(id ?? paperProfile) })}
              options={paperProfileOpts}
              name={`paper-profile-${line.id}`}
            />
          ) : null}
          {isTickets ? (
            <InlineSwitchField
              label="Imprimir logo"
              checked={line.ticketLogoEnabled === true}
              onChange={(enabled) => onChange({ ticketLogoEnabled: enabled })}
              data-test-id={`line-ticket-logo-enabled-${line.id}`}
            />
          ) : null}
          {isTicketLike && ticketNetwork ? (
            <SharedTextField
              label="Dirección IP"
              name={`network-host-${line.id}`}
              type="text"
              density="compact"
              labelLayout="inline"
              required
              placeholder="Ej. 192.168.1.50 o 192.168.1.50:9100"
              value={line.ticketNetworkHost ?? ""}
              onChange={(e) => onChange({ ticketNetworkHost: e.target.value })}
              endAdornment={
                onNetworkProbe ? (
                  <IconButton
                    type="button"
                    icon="Network"
                    variant="basicSecondary"
                    size="xs"
                    className="min-h-5 min-w-5 p-0"
                    disabled={!printerOk || networkProbeBusy}
                    isLoading={networkProbeBusy}
                    ariaLabel="Probar conexión TCP a la impresora"
                    title="Probar conexión TCP (sin imprimir)"
                    onClick={onNetworkProbe}
                  />
                ) : undefined
              }
            />
          ) : (
            <Select
              label="Impresora del SO"
              placeholder="Seleccionar"
              density="compact"
              labelLayout="inline"
              allowClear
              required
              value={line.systemPrinterName || null}
              onChange={(pid) =>
                onChange({ systemPrinterName: pid == null ? "" : String(pid) })
              }
              options={printerOpts}
              name={`printer-${line.id}`}
            />
          )}
          {isTicketLike ? (
            <InlineSwitchField
              label="Corte automático"
              disabled={!printerOk}
              checked={line.autoCutEnabled !== false}
              onChange={(enabled) => onChange({ autoCutEnabled: enabled })}
              data-test-id={`line-auto-cut-${line.id}`}
              trailing={
                <IconButton
                  type="button"
                  icon="Scissors"
                  variant="basicSecondary"
                  size="xs"
                  className="min-h-5 min-w-5 shrink-0 p-0"
                  disabled={!printerOk || cutBusy}
                  isLoading={cutBusy}
                  ariaLabel="Probar corte automático en esta impresora"
                  title="Imprime una línea y corta el papel (solo tickets)"
                  onClick={onCutTest}
                />
              }
            />
          ) : null}
          {isTickets ? (
            <InlineSwitchField
              label="Apertura de gaveta"
              disabled={!printerOk}
              checked={line.drawerOpenEnabled === true}
              onChange={(enabled) => onChange({ drawerOpenEnabled: enabled })}
              data-test-id={`line-drawer-open-${line.id}`}
              trailing={
                onDrawerTest ? (
                  <IconButton
                    type="button"
                    icon="Inbox"
                    variant="basicSecondary"
                    size="xs"
                    className="min-h-5 min-w-5 shrink-0 p-0"
                    disabled={!printerOk || drawerTestBusy}
                    isLoading={drawerTestBusy}
                    ariaLabel="Probar apertura de gaveta"
                    title="Envía pulso ESC/POS de gaveta (corte antes si está activo)"
                    onClick={onDrawerTest}
                  />
                ) : undefined
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
