import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import IconButton from "../../shared/components/IconButton/IconButton";
import InlineSwitchField from "../../shared/components/InlineSwitchField";

export type AgentLogEntry = {
  id: string;
  at: string;
  level: string;
  message: string;
  target?: string;
};

function formatLogTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function levelClass(level: string) {
  const l = level.toLowerCase();
  if (l === "error") return "text-error font-semibold";
  if (l === "warn") return "text-amber-700 dark:text-amber-400";
  if (l === "info") return "text-sky-700 dark:text-sky-400";
  return "text-muted-foreground";
}

type Props = {
  /** Vista solo registro (ventana dedicada). */
  standalone?: boolean;
  className?: string;
};

export function AgentLogPanel({ standalone = false, className = "" }: Props) {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [includeDiag, setIncludeDiag] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const rows = (await invoke("get_agent_logs")) as AgentLogEntry[];
      setLogs(Array.isArray(rows) ? rows : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen("agent-log-update", () => {
        void fetchLogs();
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [fetchLogs]);

  async function handleClear() {
    if (!window.confirm("¿Vaciar el registro de errores?")) return;
    try {
      await invoke("clear_agent_logs");
      await fetchLogs();
    } catch {
      window.alert("No se pudo vaciar el registro.");
    }
  }

  async function handleOpenWindow() {
    try {
      await invoke("open_agent_logs_window");
    } catch {
      window.alert("No se pudo abrir la ventana de registro.");
    }
  }

  const visible = logs.filter((e) => {
    const l = e.level.toLowerCase();
    if (errorsOnly) return l === "error";
    if (!includeDiag && l === "info") return false;
    return true;
  });

  const list = (
    <div
      className={`min-h-0 overflow-y-auto rounded-md border border-border bg-neutral/30 font-mono text-[0.65rem] leading-relaxed ${
        standalone ? "max-h-[calc(100vh-8rem)]" : "max-h-48"
      }`}
    >
      {loading ? (
        <p className="p-2 text-muted-foreground">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="p-2 text-muted-foreground">
          {errorsOnly ? "Sin errores registrados." : "Sin entradas en el registro."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((e) => (
            <li key={e.id} className="px-2 py-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <time className="shrink-0 text-muted-foreground" dateTime={e.at}>
                  {formatLogTime(e.at)}
                </time>
                <span className={`shrink-0 uppercase ${levelClass(e.level)}`}>{e.level}</span>
                {e.target ? (
                  <span className="truncate text-muted-foreground" title={e.target}>
                    {e.target}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-foreground">{e.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (standalone) {
    return (
      <div className={`flex min-h-screen flex-col gap-3 p-3 ${className}`.trim()}>
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold">Registro y errores</h1>
          <div className="flex shrink-0 gap-1">
            <IconButton
              type="button"
              icon="Trash2"
              variant="basicSecondary"
              size="xs"
              ariaLabel="Vaciar registro"
              onClick={() => void handleClear()}
            />
          </div>
        </header>
        <div className="space-y-3">
          <InlineSwitchField
            label="Solo errores"
            checked={errorsOnly}
            onChange={setErrorsOnly}
          />
          <InlineSwitchField
            label="Diagnóstico ESC/POS"
            checked={includeDiag}
            disabled={errorsOnly}
            onChange={setIncludeDiag}
          />
        </div>
        {list}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="space-y-3">
        <InlineSwitchField
          label="Solo errores"
          checked={errorsOnly}
          onChange={setErrorsOnly}
        />
        <InlineSwitchField
          label="Diagnóstico ESC/POS"
          checked={includeDiag}
          disabled={errorsOnly}
          onChange={setIncludeDiag}
        />
        <div className="flex shrink-0 justify-end gap-1">
          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={() => void handleOpenWindow()}
          >
            Ventana aparte
          </button>
          <IconButton
            type="button"
            icon="Trash2"
            variant="basicSecondary"
            size="xs"
            ariaLabel="Vaciar registro"
            onClick={() => void handleClear()}
          />
        </div>
      </div>
      {list}
    </div>
  );
}
