import { BankMovement } from '../../domain/bank-movement.entity';

export interface BankMovementRepositoryPort {
  save(movement: BankMovement): Promise<BankMovement>;
  findById(id: string): Promise<BankMovement | null>;
  findAll(): Promise<BankMovement[]>;
  findAllPaginated(
    limit: number,
    offset: number,
    direction?: string,
  ): Promise<{ items: BankMovement[]; total: number }>;
  update(id: string, movement: Partial<BankMovement>): Promise<BankMovement>;
}
