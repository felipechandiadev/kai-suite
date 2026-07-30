import { Check, CheckDirection, CheckStatus } from '../../domain/check.entity';

export interface ListChecksFilter {
  companyId: string;
  status?: CheckStatus[];
  direction?: CheckDirection;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  payeeId?: string;
  limit?: number;
  offset?: number;
}

export interface CommittedOutgoingCheckSummary {
  totalAmount: number;
  checkCount: number;
  byDueDate: Array<{ dueDate: string | null; amount: number; count: number }>;
  stalePendingCount: number;
}

export interface CheckRepositoryPort {
  save(check: Check): Promise<Check>;
  findById(id: string, companyId?: string): Promise<Check | null>;
  list(
    filter: ListChecksFilter,
  ): Promise<{ items: Check[]; total: number }>;
  update(id: string, patch: Partial<Check>): Promise<Check>;
  getCommittedOutgoingSummary(
    companyId: string,
  ): Promise<CommittedOutgoingCheckSummary>;
}
