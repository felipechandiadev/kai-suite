export type AutomationEventType = "TRANSACTION_CREATED";

export type AutomationActionType =
  | "CREATE_DERIVED_TRANSACTION"
  | "GENERATE_LEDGER_ENTRIES"
  | "UPDATE_STOCK"
  | "CREATE_INSTALLMENTS"
  | "UPDATE_INSTALLMENTS_FROM_PAYMENT";

export type AutomationActionDto = {
  id: string;
  ruleId: string;
  type: AutomationActionType;
  params: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
};

export type AutomationRuleDto = {
  id: string;
  companyId: string;
  eventType: AutomationEventType;
  filters: Record<string, unknown> | null;
  priority: number;
  isActive: boolean;
  actions: AutomationActionDto[];
};

export type CreateAutomationRuleInput = {
  eventType: AutomationEventType;
  filters: Record<string, unknown> | null;
  priority: number;
  isActive: boolean;
  actions: Array<{
    type: AutomationActionType;
    params: Record<string, unknown> | null;
    sortOrder: number;
    isActive: boolean;
  }>;
};

export type UpdateAutomationRuleInput = {
  id: string;
  eventType?: AutomationEventType;
  filters?: Record<string, unknown> | null;
  priority?: number;
  isActive?: boolean;
  actions?: CreateAutomationRuleInput["actions"];
};

export type CreateAutomationRuleResult =
  | { success: true; rule: AutomationRuleDto }
  | { success: false; error: string };

export type UpdateAutomationRuleResult =
  | { success: true; rule: AutomationRuleDto }
  | { success: false; error: string };

export type DeleteAutomationRuleResult =
  | { success: true }
  | { success: false; error: string };

