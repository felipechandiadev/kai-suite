import { BaseCommand } from '@shared/cqrs';

export class CreateUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly mail: string,
    public readonly password: string,
    public readonly personId?: string,
    public readonly role: string = 'OPERATOR',
  ) {
    super();
  }
}
