export type EmployeeTimelineEntryView = {
  id: string;
  companyId: string;
  employeeId: string;
  occurredAt: string;
  kind: string;
  title: string;
  body: string | null;
  actorUserId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export const TIMELINE_KIND_LABELS: Record<string, string> = {
  NOTE: "Anotación",
  CONTRACT_CREATED: "Contrato creado",
  CONTRACT_SUPERSEDED: "Nueva versión de contrato",
  SHIFT_CHANGED: "Cambio de turno",
  ORG_UNIT_CHANGED: "Cambio de unidad",
  EMPLOYEE_UPDATED: "Actualización de ficha",
  SCHEDULE_EXCEPTION: "Excepción de jornada",
  PAYROLL_CREATED: "Liquidación creada",
  PAYROLL_PAID: "Liquidación pagada",
};
