import { Remuneration } from '../../domain/remuneration.entity';

export interface RemunerationRepositoryPort {
  save(remuneration: Remuneration): Promise<Remuneration>;
  findById(id: string): Promise<Remuneration | null>;
  findAll(): Promise<Remuneration[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ items: Remuneration[]; total: number }>;
  update(
    id: string,
    remuneration: Partial<Remuneration>,
  ): Promise<Remuneration>;
}
