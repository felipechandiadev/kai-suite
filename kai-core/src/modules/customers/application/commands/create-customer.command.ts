import { BaseCommand } from '@shared/cqrs';

export class CreateCustomerCommand extends BaseCommand {
  constructor(
    public readonly personType: string,
    public readonly firstName: string,
    public readonly userId: string,
    public readonly lastName?: string,
    public readonly businessName?: string,
    public readonly documentNumber?: string,
    public readonly documentType?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly creditLimit?: number,
    public readonly paymentDayOfMonth?: number,
    public readonly notes?: string,
  ) {
    super();
  }
}
