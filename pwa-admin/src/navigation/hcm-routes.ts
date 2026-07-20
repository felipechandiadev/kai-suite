/** Rutas admin de Capital humano (HCM). URLs en inglés; labels del menú en español. */
export const HCM_EMPLOYEES = "/hcm/employees";
export const HCM_SHIFTS = "/hcm/shifts";
export const HCM_WORK_SCHEDULES = "/hcm/work-schedules";
export const HCM_REMUNERATIONS = "/hcm/remunerations";
export const HCM_JOB_POSITIONS = "/hcm/job-positions";

export const HCM_WORK_SCHEDULES_SETTINGS = `${HCM_WORK_SCHEDULES}/settings`;
export const HCM_WORK_SCHEDULES_TEMPLATES = `${HCM_WORK_SCHEDULES}/templates`;
export const HCM_WORK_SCHEDULES_EXCEPTIONS = `${HCM_WORK_SCHEDULES}/exceptions`;
export const HCM_WORK_SCHEDULES_COMPENSATORY = `${HCM_WORK_SCHEDULES}/compensatory`;
export const HCM_WORK_SCHEDULES_STATEMENTS = `${HCM_WORK_SCHEDULES}/statements`;

/** Hub de configuración Capital humano (dentro del menú HCM) */
export const HCM_SETTINGS = "/hcm/settings";
export const HCM_SETTINGS_JORNADA = `${HCM_SETTINGS}/jornada`;
export const HCM_SETTINGS_CONTRACTS = `${HCM_SETTINGS}/contracts`;
export const HCM_SETTINGS_JOB_POSITIONS = `${HCM_SETTINGS}/job-positions`;
export const HCM_SETTINGS_AFP = `${HCM_SETTINGS}/afp`;
export const HCM_SETTINGS_ORG_UNITS = `${HCM_SETTINGS}/organizational-units`;
export const HCM_SETTINGS_LABOR_UNITS = `${HCM_SETTINGS}/labor-units`;

/** @deprecated Usar {@link HCM_SETTINGS_ORG_UNITS}; redirect desde `/hcm/organizational-units`. */
export const HCM_ORGANIZATIONAL_UNITS = HCM_SETTINGS_ORG_UNITS;
/** @deprecated Usar HCM_SETTINGS*; se mantienen para redirects/compat. */
export const SETTINGS_HCM = HCM_SETTINGS;
export const SETTINGS_HCM_JORNADA = HCM_SETTINGS_JORNADA;
export const SETTINGS_HCM_CONTRACTS = HCM_SETTINGS_CONTRACTS;
export const SETTINGS_HCM_JOB_POSITIONS = HCM_SETTINGS_JOB_POSITIONS;
export const SETTINGS_HCM_AFP = HCM_SETTINGS_AFP;
export const SETTINGS_HCM_ORG_UNITS = HCM_SETTINGS_ORG_UNITS;

export function employeeDetailPath(
  employeeId: string,
  opts?: { returnTo?: string | null },
): string {
  const id = employeeId.trim();
  const base = `${HCM_EMPLOYEES}/${encodeURIComponent(id)}`;
  const returnTo = opts?.returnTo?.trim();
  if (!returnTo) return base;
  const qs = new URLSearchParams();
  qs.set("returnTo", returnTo);
  return `${base}?${qs.toString()}`;
}
