import { BaseCommand } from '@shared/cqrs';
import type { PersonEconomicActivity } from '@modules/persons/domain/person.entity';

export class UpdateCustomerCommand extends BaseCommand {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
    public readonly creditLimit?: number,
    public readonly paymentDayOfMonth?: number,
    public readonly notes?: string,
    public readonly isActive?: boolean,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly businessName?: string,
    public readonly documentType?: 'RUT' | 'PASSPORT' | 'OTHER',
    public readonly documentNumber?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly regionCode?: string | null,
    public readonly regionName?: string | null,
    public readonly communeCode?: string | null,
    public readonly communeName?: string | null,
    public readonly treasuryCode?: string | null,
    public readonly activityStarted?: boolean,
    public readonly economicActivities?: PersonEconomicActivity[] | null,
  ) {
    super();
  }
}
