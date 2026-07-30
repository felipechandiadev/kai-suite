import { ChartOfAccountsRequest } from "../infrastructure/chart-of-accounts.request";
import type { ChartOfAccountsHierarchy } from "../types/chart-of-accounts.types";

export class ListChartOfAccountsUseCase {
  static async execute(input?: {
    includeInactive?: boolean;
  }): Promise<{ success: true; data: ChartOfAccountsHierarchy } | { success: false; error: string; data: ChartOfAccountsHierarchy }> {
    return ChartOfAccountsRequest.getHierarchy(Boolean(input?.includeInactive));
  }
}

