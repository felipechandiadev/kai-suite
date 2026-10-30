import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AccountingAccount,
  AccountType,
} from '@modules/accounting-accounts/domain/accounting-account.entity';
import {
  AccountingRule,
  RuleAmountBasis,
  RuleScope,
} from '../domain/accounting-rule.entity';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

export type CogsProvisionResult = {
  companyId: string;
  inventoryAccount: { id: string; code: string; name: string } | null;
  cogsAccount: { id: string; code: string; name: string; created: boolean } | null;
  rulesCreated: string[];
  rulesExisting: string[];
  warnings: string[];
};

const INVENTORY_NAME = /inventario|existencias|mercader[ií]as?\b/i;
const COGS_NAME = /costo\s+de\s+(ventas?|mercader[ií]as?)/i;
const PREFERRED_INVENTORY_CODES = ['1.2.01', '1201', '1300'];
const PREFERRED_COGS_CODES = ['5.1.01', '5101', '5100'];

/**
 * Crea (de forma idempotente) las reglas de costo de ventas de una compañía:
 * - SALE (por línea, base costo):        Dr Costo de ventas / Cr Inventario
 * - SALE_RETURN (por línea, base costo): Dr Inventario / Cr Costo de ventas
 * Detecta las cuentas por código o nombre; crea "Costo de ventas" si no existe.
 * No crea la cuenta de Inventario: si falta, informa y no genera reglas.
 */
@Injectable()
export class CogsRulesProvisionerService {
  private readonly logger = new Logger(CogsRulesProvisionerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async provision(
    companyId: string,
    opts?: { dryRun?: boolean },
  ): Promise<CogsProvisionResult> {
    const result: CogsProvisionResult = {
      companyId,
      inventoryAccount: null,
      cogsAccount: null,
      rulesCreated: [],
      rulesExisting: [],
      warnings: [],
    };
    const dryRun = opts?.dryRun === true;

    return this.dataSource.transaction(async (manager) => {
      const accountRepo = manager.getRepository(AccountingAccount);
      const ruleRepo = manager.getRepository(AccountingRule);
      const accounts = await accountRepo.find({
        where: { companyId, isActive: true },
      });

      const pick = (
        type: AccountType,
        nameRe: RegExp,
        preferredCodes: string[],
      ): AccountingAccount | null => {
        const byType = accounts.filter((a) => a.type === type);
        for (const code of preferredCodes) {
          const hit = byType.find((a) => a.code === code);
          if (hit) return hit;
        }
        const named = byType.filter((a) => nameRe.test(a.name));
        // Prefiere cuentas hoja (con padre) sobre agrupadoras.
        return named.find((a) => a.parentId) ?? named[0] ?? null;
      };

      const inventory = pick(AccountType.ASSET, INVENTORY_NAME, PREFERRED_INVENTORY_CODES);
      if (!inventory) {
        result.warnings.push(
          'No existe una cuenta de activo "Inventario/Existencias/Mercaderías". Créela en el plan de cuentas y vuelva a ejecutar.',
        );
        return result;
      }
      result.inventoryAccount = {
        id: inventory.id,
        code: inventory.code,
        name: inventory.name,
      };

      let cogs = pick(AccountType.EXPENSE, COGS_NAME, PREFERRED_COGS_CODES);
      let created = false;
      if (!cogs) {
        const code = this.nextFreeCode(accounts, PREFERRED_COGS_CODES);
        if (dryRun) {
          result.warnings.push(`[dry-run] se crearía la cuenta ${code} "Costo de ventas".`);
          return result;
        }
        cogs = await accountRepo.save(
          accountRepo.create({
            companyId,
            code,
            name: 'Costo de ventas',
            type: AccountType.EXPENSE,
            isActive: true,
          }),
        );
        created = true;
      }
      result.cogsAccount = {
        id: cogs.id,
        code: cogs.code,
        name: cogs.name,
        created,
      };

      const specs: Array<{
        type: TransactionType;
        debit: string;
        credit: string;
        label: string;
      }> = [
        {
          type: TransactionType.SALE,
          debit: cogs.id,
          credit: inventory.id,
          label: 'Costo de ventas (SALE)',
        },
        {
          type: TransactionType.SALE_RETURN,
          debit: inventory.id,
          credit: cogs.id,
          label: 'Reverso de costo de ventas (SALE_RETURN)',
        },
      ];

      for (const spec of specs) {
        const existing = await ruleRepo.findOne({
          where: {
            companyId,
            transactionType: spec.type,
            appliesTo: RuleScope.TRANSACTION_LINE,
            amountBasis: RuleAmountBasis.LINE_COST,
            isActive: true,
          },
        });
        if (existing) {
          result.rulesExisting.push(spec.label);
          continue;
        }
        if (!dryRun) {
          await ruleRepo.save(
            ruleRepo.create({
              companyId,
              appliesTo: RuleScope.TRANSACTION_LINE,
              transactionType: spec.type,
              amountBasis: RuleAmountBasis.LINE_COST,
              debitAccountId: spec.debit,
              creditAccountId: spec.credit,
              priority: 95,
              isActive: true,
            }),
          );
        }
        result.rulesCreated.push(spec.label);
      }
      this.logger.log(
        `COGS provision company=${companyId} created=${result.rulesCreated.length} existing=${result.rulesExisting.length}${dryRun ? ' (dry-run)' : ''}`,
      );
      return result;
    });
  }

  private nextFreeCode(accounts: AccountingAccount[], preferred: string[]): string {
    const used = new Set(accounts.map((a) => a.code));
    for (const code of preferred) {
      if (!used.has(code)) return code;
    }
    return '5.1.99';
  }
}
