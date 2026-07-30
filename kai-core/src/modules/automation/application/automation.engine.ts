import { Injectable, Logger } from '@nestjs/common';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationEventType } from '../domain/automation-event-type.enum';
import { AutomationActionType } from '../domain/automation-action-type.enum';
import { CreateDerivedTransactionActionHandler } from './handlers/actions/create-derived-transaction.action';
import { UpdateStockActionHandler } from './handlers/actions/update-stock.action';

export type AutomationContext = {
  companyId: string;
  eventType: AutomationEventType;
  payload: any;
};

@Injectable()
export class AutomationEngine {
  private readonly logger = new Logger(AutomationEngine.name);

  constructor(
    private readonly rulesService: AutomationRulesService,
    private readonly createDerivedTx: CreateDerivedTransactionActionHandler,
    private readonly updateStock: UpdateStockActionHandler,
  ) {}

  async handle(ctx: AutomationContext) {
    const rules = await this.rulesService.list(ctx.companyId, ctx.eventType);
    const active = (rules ?? []).filter((r: any) => r?.isActive !== false);
    for (const rule of active) {
      if (!this.matches(rule.filters ?? null, ctx.payload)) {
        continue;
      }
      const actions = Array.isArray((rule as any).actions) ? (rule as any).actions : [];
      const activeActions = actions
        .filter((a: any) => a?.isActive !== false)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      for (const action of activeActions) {
        try {
          switch (action.type as AutomationActionType) {
            case AutomationActionType.CREATE_DERIVED_TRANSACTION:
              await this.createDerivedTx.execute(ctx, rule, action);
              break;
            case AutomationActionType.UPDATE_STOCK:
              await this.updateStock.execute(ctx, rule);
              break;
            default:
              this.logger.warn(
                `Unsupported automation action type=${String(action.type)} ruleId=${rule.id}`,
              );
              break;
          }
        } catch (e) {
          this.logger.error(
            `Automation action failed type=${String(action.type)} ruleId=${rule.id}: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }
    }
  }

  private matches(filters: Record<string, any> | null, payload: any): boolean {
    if (!filters) return true;
    const tx = payload?.transaction ?? payload;

    const getByPath = (obj: any, path: string) => {
      if (!obj || typeof obj !== 'object') return undefined;
      if (!path.includes('.')) return obj[path];
      return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
    };

    const isEmptyFilterValue = (v: any) =>
      v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

    const matchesValue = (actual: any, expected: any) => {
      if (Array.isArray(expected)) {
        return expected.map(String).includes(String(actual ?? ''));
      }
      return String(actual ?? '') === String(expected);
    };

    for (const [key, expected] of Object.entries(filters)) {
      if (isEmptyFilterValue(expected)) continue;
      const actual = getByPath(tx, key);
      if (!matchesValue(actual, expected)) {
        return false;
      }
    }
    return true;
  }
}

