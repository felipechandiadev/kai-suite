import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';

export interface AccountHierarchyNode {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
  balance: number;
  children: AccountHierarchyNode[];
}

export interface GetAccountHierarchyResult {
  hierarchy: AccountHierarchyNode[];
}

export class GetAccountHierarchyQuery {
  constructor(public readonly includeInactive: boolean = false) {}
}

@Injectable()
@QueryHandler(GetAccountHierarchyQuery)
export class GetAccountHierarchyQueryHandler implements IQueryHandler<GetAccountHierarchyQuery> {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly accountRepository: Repository<AccountingAccount>,
  ) {}

  async execute(
    query: GetAccountHierarchyQuery,
  ): Promise<GetAccountHierarchyResult> {
    const { includeInactive } = query;

    const queryBuilder = this.accountRepository.createQueryBuilder('account');

    if (!includeInactive) {
      queryBuilder.where('account.isActive = :isActive', { isActive: true });
    }

    const accounts = await queryBuilder
      .orderBy('account.code', 'ASC')
      .getMany();

    const nodeMap = new Map<string, AccountHierarchyNode>();
    const roots: AccountHierarchyNode[] = [];

    // Create nodes
    for (const account of accounts) {
      nodeMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentId ?? null,
        isActive: account.isActive,
        balance: 0, // TODO: Calculate actual balance
        children: [],
      });
    }

    // Build tree structure
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort tree recursively
    const sortTree = (nodes: AccountHierarchyNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      for (const node of nodes) {
        if (node.children.length > 0) {
          sortTree(node.children);
        }
      }
    };

    sortTree(roots);

    return { hierarchy: roots };
  }
}
