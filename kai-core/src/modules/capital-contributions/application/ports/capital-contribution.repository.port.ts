import { CapitalContribution } from '../../domain/capital-contribution.entity';

export interface CapitalContributionRepositoryPort {
  save(contribution: CapitalContribution): Promise<CapitalContribution>;
  findById(id: string): Promise<CapitalContribution | null>;
  findAll(): Promise<CapitalContribution[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: CapitalContribution[]; total: number }>;
  update(
    id: string,
    contribution: Partial<CapitalContribution>,
  ): Promise<CapitalContribution>;
}
