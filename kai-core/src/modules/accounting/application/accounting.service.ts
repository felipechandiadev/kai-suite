import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildLedger } from '../../../shared/application/AccountingEngine';
import { BuildLedgerDto } from './dto/build-ledger.dto';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

@Injectable()
export class AccountingService {
  constructor(private readonly dataSource: DataSource) {}

  async getHierarchy(includeInactive: boolean) {
    const repository = this.dataSource.getRepository(AccountingAccount);
    const query = repository.createQueryBuilder('account');

    if (!includeInactive) {
      query.where('account.isActive = :isActive', { isActive: true });
    }

    const accounts = await query.orderBy('account.code', 'ASC').getMany();

    const nodeMap = new Map<string, any>();
    const roots: any[] = [];

    for (const account of accounts) {
      nodeMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentId ?? null,
        isActive: account.isActive,
        balance: 0,
        children: [],
      });
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortTree = (nodes: any[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortTree(node.children);
        }
      }
    };

    sortTree(roots);
    return roots;
  }

  async getLedgerData(includeInactive: boolean) {
    const repository = this.dataSource.getRepository(AccountingAccount);
    const query = repository.createQueryBuilder('account');

    if (!includeInactive) {
      query.where('account.isActive = :isActive', { isActive: true });
    }

    const accounts = await query.orderBy('account.code', 'ASC').getMany();

    // Obtener asientos contables creados
    const ledgerRepo = this.dataSource.getRepository(LedgerEntry);
    const ledgerEntries = await ledgerRepo.find({
      relations: ['transaction', 'account'],
      order: { entryDate: 'DESC' },
    });

    const entries = (ledgerEntries || []).map((entry: LedgerEntry) => ({
      id: entry.id,
      transactionId: entry.transactionId,
      accountId: entry.accountId,
      accountCode: entry.account?.code,
      accountName: entry.account?.name,
      date: entry.entryDate,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      reference:
        entry.transaction?.documentNumber ||
        entry.transaction?.externalReference,
    }));

    return {
      entries: entries || [],
      accounts: accounts.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
      })),
    };
  }

  async buildLedger(dto: BuildLedgerDto) {
    const params: any = {
      companyId: dto.companyId,
    };

    if (dto.from) params.from = new Date(dto.from);
    if (dto.to) params.to = new Date(dto.to);
    if (dto.resultCenterId) params.resultCenterId = dto.resultCenterId;
    if (dto.limitTransactions) params.limitTransactions = dto.limitTransactions;

    const result = await buildLedger(this.dataSource, params);

    return {
      success: true,
      data: {
        accounts: result.accounts,
        postings: result.postings,
        balanceByAccount: result.balanceByAccount,
      },
    };
  }
}
