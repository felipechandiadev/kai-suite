import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule } from '../domain/automation-rule.entity';
import { AutomationAction } from '../domain/automation-action.entity';
import { AutomationEventType } from '../domain/automation-event-type.enum';
import { AutomationActionType } from '../domain/automation-action-type.enum';

export type AutomationActionInput = {
  id?: string;
  type: AutomationActionType;
  params?: Record<string, any> | null;
  sortOrder: number;
  isActive: boolean;
};

export type CreateAutomationRuleDto = {
  companyId: string;
  eventType: AutomationEventType;
  filters?: Record<string, any> | null;
  priority: number;
  isActive: boolean;
  actions: AutomationActionInput[];
};

export type UpdateAutomationRuleDto = Partial<Omit<CreateAutomationRuleDto, 'companyId'>> & {
  actions?: AutomationActionInput[];
};

@Injectable()
export class AutomationRulesService {
  constructor(
    @InjectRepository(AutomationRule)
    private readonly rulesRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationAction)
    private readonly actionsRepo: Repository<AutomationAction>,
  ) {}

  async list(companyId: string, eventType?: AutomationEventType) {
    const where: any = { companyId };
    if (eventType) where.eventType = eventType;
    return this.rulesRepo.find({
      where,
      order: { priority: 'ASC' },
      relations: ['actions'],
    });
  }

  async findById(id: string) {
    return this.rulesRepo.findOne({ where: { id }, relations: ['actions'] });
  }

  async create(dto: CreateAutomationRuleDto) {
    const rule = await this.rulesRepo.save(
      this.rulesRepo.create({
        companyId: dto.companyId,
        eventType: dto.eventType,
        filters: dto.filters ?? null,
        priority: dto.priority ?? 0,
        isActive: dto.isActive !== false,
      }),
    );
    await this.replaceActions(rule.id, dto.actions ?? []);
    return this.findById(rule.id);
  }

  async update(id: string, dto: UpdateAutomationRuleDto) {
    const updateData: any = {};
    if (dto.eventType !== undefined) updateData.eventType = dto.eventType;
    if (dto.filters !== undefined) updateData.filters = dto.filters ?? null;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    await this.rulesRepo.update(id, updateData);
    if (dto.actions !== undefined) {
      await this.replaceActions(id, dto.actions ?? []);
    }
    return this.findById(id);
  }

  async remove(id: string) {
    await this.rulesRepo.update(id, { isActive: false } as any);
    return { success: true };
  }

  async simulate(input: {
    companyId: string;
    eventType: AutomationEventType;
    payload: any;
  }) {
    const rules = await this.list(input.companyId, input.eventType);
    const matched: Array<{
      ruleId: string;
      priority: number;
      actions: Array<{ id: string; type: AutomationActionType; sortOrder: number }>;
    }> = [];
    for (const r of rules) {
      if (r.isActive === false) continue;
      if (!this.matches(r.filters ?? null, input.payload)) continue;
      const actions = Array.isArray((r as any).actions) ? (r as any).actions : [];
      matched.push({
        ruleId: r.id,
        priority: r.priority,
        actions: actions
          .filter((a: any) => a?.isActive !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((a: any) => ({ id: a.id, type: a.type, sortOrder: a.sortOrder ?? 0 })),
      });
    }
    return matched;
  }

  private async replaceActions(ruleId: string, actions: AutomationActionInput[]) {
    await this.actionsRepo.delete({ ruleId } as any);
    const sorted = [...actions].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const a of sorted) {
      const row = this.actionsRepo.create({
        ruleId,
        type: a.type,
        params: a.params ?? null,
        sortOrder: a.sortOrder ?? 0,
        isActive: a.isActive !== false,
      });
      await this.actionsRepo.save(row);
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

