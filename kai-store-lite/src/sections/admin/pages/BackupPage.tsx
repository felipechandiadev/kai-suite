import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, BasicPageLayout, Button } from "@kai/ui";
import { toUserMessage } from "@/lib/errors";

export function BackupPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportBackup() {
    setMsg(null);
    setError(null);
    try {
      const path = await invoke<string>("backup_export");
      setMsg(`Exportado: ${path}`);
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  async function restoreBackup() {
    setMsg(null);
    setError(null);
    try {
      await invoke("backup_restore");
      setMsg("Restaurado. Reinicia la app.");
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  return (
    <BasicPageLayout
      title="Backup"
      subtitle="Exporta/restaura SQLite de negocio. Al restaurar en otra máquina puede requerir re-licencia."
    >
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void exportBackup()}>
          Exportar
        </Button>
        <Button type="button" variant="outlined" onClick={() => void restoreBackup()}>
          Restaurar…
        </Button>
      </div>
      {msg ? (
        <Alert className="mt-4" variant="success">
          {msg}
        </Alert>
      ) : null}
      {error ? (
        <Alert className="mt-4" variant="error">
          {error}
        </Alert>
      ) : null}
    </BasicPageLayout>
  );
}
