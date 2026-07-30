import type { AutomationActionType, AutomationEventType } from "@/features/automation/types/automation.types";

export const AUTOMATION_EVENT_OPTIONS: Array<{ id: AutomationEventType; label: string }> = [
  { id: "TRANSACTION_CREATED", label: "Transacción creada" },
];

export const AUTOMATION_ACTION_OPTIONS: Array<{ id: AutomationActionType; label: string }> = [
  { id: "UPDATE_STOCK", label: "Actualizar stock" },
  { id: "CREATE_INSTALLMENTS", label: "Crear cuotas" },
  { id: "UPDATE_INSTALLMENTS_FROM_PAYMENT", label: "Actualizar cuotas desde pago" },
  { id: "CREATE_DERIVED_TRANSACTION", label: "Crear transacción derivada" },
];

