import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  AccountingRuleLine,
  AccountingRuleLineAmountMode,
  AccountingRuleLineSide,
} from '@modules/accounting-rules/domain/accounting-rule-line.entity';

export interface CreateAccountingRuleDto {
  companyId: string;
  appliesTo: 'TRANSACTION' | 'TRANSACTION_LINE';
  transactionType: string;
  expenseCategoryId?: string;
  taxId?: string;
  paymentMethod?: string;
  debitAccountId: string;
  creditAccountId: string;
  lines?: {
    side: AccountingRuleLineSide | 'DEBIT' | 'CREDIT';
    accountId: string;
    amountMode: AccountingRuleLineAmountMode | 'TOTAL' | 'SUBTOTAL' | 'TAX' | 'DISCOUNT' | 'FIXED';
    amountValue?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }[];
  priority: number;
  isActive?: boolean;
}

export interface UpdateAccountingRuleDto {
  expenseCategoryId?: string;
  taxId?: string;
  paymentMethod?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  lines?: {
    side: AccountingRuleLineSide | 'DEBIT' | 'CREDIT';
    accountId: string;
    amountMode: AccountingRuleLineAmountMode | 'TOTAL' | 'SUBTOTAL' | 'TAX' | 'DISCOUNT' | 'FIXED';
    amountValue?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }[];
  priority?: number;
  isActive?: boolean;
}

@Injectable()
export class AccountingRulesService {
  constructor(
    @InjectRepository(AccountingRule)
    private rulesRepo: Repository<AccountingRule>,
    @InjectRepository(AccountingRuleLine)
    private ruleLinesRepo: Repository<AccountingRuleLine>,
  ) {}

  private inferDebitCreditFromLines(lines: CreateAccountingRuleDto['lines'] | UpdateAccountingRuleDto['lines']) {
    const active = (lines ?? []).filter((l) => l && l.isActive !== false);
    const debit = active.find((l) => String(l.side) === 'DEBIT')?.accountId;
    const credit = active.find((l) => String(l.side) === 'CREDIT')?.accountId;
    return { debit, credit };
  }

  private normalizeLines(lines: NonNullable<CreateAccountingRuleDto['lines']> | NonNullable<UpdateAccountingRuleDto['lines']>) {
    return (lines ?? [])
      .filter((l) => l && typeof l.accountId === 'string' && l.accountId.trim())
      .map((l, i) => ({
        side: l.side as any,
        accountId: l.accountId,
        amountMode: l.amountMode as any,
        amountValue: l.amountMode === 'FIXED' ? (l.amountValue ?? null) : null,
        sortOrder: Number.isFinite(Number(l.sortOrder)) ? Number(l.sortOrder) : i,
        isActive: l.isActive !== false,
      }));
  }

  async create(dto: CreateAccountingRuleDto): Promise<AccountingRule> {
    const inferred = dto.lines?.length ? this.inferDebitCreditFromLines(dto.lines) : null;
    const ruleData: any = {
      ...dto,
      isActive: dto.isActive ?? true,
      debitAccountId: dto.debitAccountId ?? inferred?.debit,
      creditAccountId: dto.creditAccountId ?? inferred?.credit,
    };
    const { lines, ...rest } = ruleData;
    const rule = await this.rulesRepo.save(rest);

    if (Array.isArray(dto.lines) && dto.lines.length > 0) {
      const normalized = this.normalizeLines(dto.lines);
      await this.ruleLinesRepo.delete({ ruleId: rule.id } as any);
      for (const l of normalized) {
        const row = this.ruleLinesRepo.create({ ...l, ruleId: rule.id });
        await this.ruleLinesRepo.save(row);
      }
    }
    return rule;
  }

  async findAll(companyId: string): Promise<AccountingRule[]> {
    return this.rulesRepo.find({
      where: { companyId, isActive: true },
      order: { priority: 'ASC' },
    });
  }

  async findById(id: string): Promise<AccountingRule | null> {
    return this.rulesRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    dto: UpdateAccountingRuleDto,
  ): Promise<AccountingRule> {
    if (Array.isArray(dto.lines)) {
      const normalized = this.normalizeLines(dto.lines);
      await this.ruleLinesRepo.delete({ ruleId: id } as any);
      for (const l of normalized) {
        const row = this.ruleLinesRepo.create({ ...l, ruleId: id });
        await this.ruleLinesRepo.save(row);
      }
      const inferred = this.inferDebitCreditFromLines(dto.lines);
      // Mantener columnas legacy en sync para compatibilidad
      if (inferred.debit) (dto as any).debitAccountId = inferred.debit;
      if (inferred.credit) (dto as any).creditAccountId = inferred.credit;
    }
    const { lines, ...rest } = dto as any;
    await this.rulesRepo.update(id, rest as any);
    return this.findById(id) as Promise<AccountingRule>;
  }

  async deactivate(id: string): Promise<void> {
    await this.rulesRepo.update(id, { isActive: false } as any);
  }

  async findByTransactionType(
    companyId: string,
    transactionType: string,
  ): Promise<AccountingRule[]> {
    return this.rulesRepo.find({
      where: { companyId, transactionType, isActive: true } as any,
      order: { priority: 'ASC' },
    });
  }
}
