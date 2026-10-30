import { LedgerEntriesService } from '../../application/ledger-entries.service';
import { resolveLineCostAmount } from '../../application/ledger-cost.util';
import {
  AccountingRule,
  RuleAmountBasis,
  RuleScope,
} from '@modules/accounting-rules/domain/accounting-rule.entity';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('resolveLineCostAmount', () => {
  it('multiplica unitCost por la cantidad de la línea y redondea a 2 decimales', () => {
    expect(resolveLineCostAmount({ unitCost: 33.333, quantity: 3 })).toBe(100);
    expect(resolveLineCostAmount({ unitCost: 1250.5, quantity: 2 })).toBe(2501);
  });

  it('devuelve 0 sin costo o sin cantidad', () => {
    expect(resolveLineCostAmount({ unitCost: 0, quantity: 2 })).toBe(0);
    expect(resolveLineCostAmount({ unitCost: undefined, quantity: 2 })).toBe(0);
    expect(resolveLineCostAmount({ unitCost: 100, quantity: 0 })).toBe(0);
  });
});

describe('LedgerEntriesService — reglas de costo (LINE_COST)', () => {
  const service = new LedgerEntriesService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const costRule = {
    id: 'rule-cost',
    appliesTo: RuleScope.TRANSACTION_LINE,
    transactionType: TransactionType.SALE,
    amountBasis: RuleAmountBasis.LINE_COST,
    debitAccountId: 'acc-cogs',
    creditAccountId: 'acc-inv',
  } as unknown as AccountingRule;

  const totalRule = {
    id: 'rule-income',
    appliesTo: RuleScope.TRANSACTION_LINE,
    transactionType: TransactionType.SALE,
    amountBasis: RuleAmountBasis.LINE_TOTAL,
    debitAccountId: 'acc-cash',
    creditAccountId: 'acc-income',
  } as unknown as AccountingRule;

  function sale(lines: Array<Record<string, unknown>>) {
    return {
      id: 'sale-1',
      transactionType: TransactionType.SALE,
      createdAt: new Date('2026-10-01T10:00:00Z'),
      total: 0,
      lines,
    } as any;
  }

  async function run(
    lines: Array<Record<string, unknown>>,
    rules: AccountingRule[],
    excluded: Set<string> = new Set(),
  ) {
    const warnings: any[] = [];
    const entries = await (service as any).calculateEntries(
      sale(lines),
      rules,
      null,
      'co-1',
      excluded,
      warnings,
    );
    return { entries, warnings };
  }

  it('genera Dr Costo / Cr Inventario por unitCost × cantidad', async () => {
    const { entries, warnings } = await run(
      [{ id: 'l1', productVariantId: 'v1', quantity: 3, unitCost: 400, total: 1500 }],
      [costRule],
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ accountId: 'acc-cogs', debit: 1200, credit: 0 });
    expect(entries[1]).toMatchObject({ accountId: 'acc-inv', debit: 0, credit: 1200 });
    expect(warnings).toHaveLength(0);
  });

  it('la regla de ingreso sigue usando el total de la línea', async () => {
    const { entries } = await run(
      [{ id: 'l1', productVariantId: 'v1', quantity: 3, unitCost: 400, total: 1500 }],
      [totalRule, costRule],
    );
    const income = entries.find((e: any) => e.accountId === 'acc-income');
    expect(income.credit).toBe(1500);
    const cogs = entries.find((e: any) => e.accountId === 'acc-cogs');
    expect(cogs.debit).toBe(1200);
  });

  it('omite líneas sin costo y emite advertencia', async () => {
    const { entries, warnings } = await run(
      [
        { id: 'l1', productVariantId: 'v1', quantity: 1, unitCost: 0, total: 500 },
        { id: 'l2', productVariantId: 'v2', quantity: 2, unitCost: 100, total: 600 },
      ],
      [costRule],
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].debit).toBe(200);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: 'LINES_WITHOUT_COST', severity: 'WARNING' });
  });

  it('omite líneas excluidas (costo reconocido por consumo de insumos)', async () => {
    const { entries, warnings } = await run(
      [{ id: 'l1', productVariantId: 'v1', quantity: 1, unitCost: 900, total: 2000 }],
      [costRule],
      new Set(['l1']),
    );
    expect(entries).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('el asiento de costo balancea (debe = haber)', async () => {
    const { entries } = await run(
      [
        { id: 'l1', productVariantId: 'v1', quantity: 2, unitCost: 333.33, total: 900 },
        { id: 'l2', productVariantId: 'v2', quantity: 5, unitCost: 10, total: 90 },
      ],
      [costRule],
    );
    const debit = entries.reduce((s: number, e: any) => s + e.debit, 0);
    const credit = entries.reduce((s: number, e: any) => s + e.credit, 0);
    expect(debit).toBeCloseTo(credit, 2);
    expect(debit).toBeCloseTo(716.66, 2);
  });
});
