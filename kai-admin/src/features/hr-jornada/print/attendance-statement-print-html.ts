import { DOCUMENT_HEADER_PRINT_CSS } from "@kai/document-print";

export type AttendanceStatementSnapshot = {
  employeeName?: string;
  documentNumber?: string | null;
  periodStart: string;
  periodEnd: string;
  rows?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    plannedOvertimeMinutes?: number;
  }>;
  exceptions?: Array<{
    date: string;
    type: string;
    minutes: number;
    notes?: string | null;
  }>;
  generatedAt?: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAttendanceStatementHtml(
  snapshot: AttendanceStatementSnapshot,
  company?: { name?: string; rut?: string | null },
): string {
  const rows = (snapshot.rows ?? [])
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.startTime)}–${escapeHtml(r.endTime)}</td><td>${r.plannedOvertimeMinutes ?? 0}</td></tr>`,
    )
    .join("");
  const exceptions = (snapshot.exceptions ?? [])
    .map(
      (e) =>
        `<tr><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.type)}</td><td>${e.minutes}</td><td>${escapeHtml(e.notes ?? "")}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Comprobante de asistencia</title>
<style>
${DOCUMENT_HEADER_PRINT_CSS}
body { font-family: system-ui, sans-serif; color: #111; padding: 24px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
th { background: #f5f5f5; }
.sign { margin-top: 48px; display: flex; gap: 48px; }
.sign div { flex: 1; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; }
</style>
</head>
<body>
<div class="companyHeader">
  <div>
    <p class="companyKicker">Comprobante</p>
    <h1 class="companyName">${escapeHtml(company?.name ?? "Kai")}</h1>
    ${company?.rut ? `<p class="companyInline">RUT: ${escapeHtml(company.rut)}</p>` : ""}
  </div>
  <div class="documentMeta">
    <h2 class="documentTitle">Asistencia</h2>
    <p class="documentFolio">${escapeHtml(snapshot.periodStart)} / ${escapeHtml(snapshot.periodEnd)}</p>
  </div>
</div>
<div class="separator"></div>
<p><strong>Empleado:</strong> ${escapeHtml(snapshot.employeeName ?? "")}
${snapshot.documentNumber ? ` · RUT ${escapeHtml(String(snapshot.documentNumber))}` : ""}</p>
<h2>Turnos planificados</h2>
<table>
<thead><tr><th>Fecha</th><th>Horario</th><th>HE (min)</th></tr></thead>
<tbody>${rows || `<tr><td colspan="3">Sin turnos</td></tr>`}</tbody>
</table>
<h2>Excepciones</h2>
<table>
<thead><tr><th>Fecha</th><th>Tipo</th><th>Minutos</th><th>Notas</th></tr></thead>
<tbody>${exceptions || `<tr><td colspan="4">Sin excepciones</td></tr>`}</tbody>
</table>
<div class="sign">
  <div>Firma empleado</div>
  <div>Visto bueno supervisor</div>
</div>
</body>
</html>`;
}
