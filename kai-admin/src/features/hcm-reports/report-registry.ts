import type { ReportRegistryEntry } from "./types/hcm-report.types";

export const HCM_REPORT_REGISTRY: ReportRegistryEntry[] = [
  {
    id: "hours-planned-by-employee",
    title: "Horas planificadas por empleado",
    description:
      "Suma de jornadas planificadas, HE y excepciones en el período.",
    wave: "mvp",
    category: "jornada",
    params: [
      { kind: "dateRange", required: true },
      { kind: "laborUnit" },
      { kind: "employeeMulti" },
    ],
  },
];

export function getReportEntry(id: string): ReportRegistryEntry | undefined {
  return HCM_REPORT_REGISTRY.find((r) => r.id === id);
}
