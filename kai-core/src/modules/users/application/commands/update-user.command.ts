import { BaseCommand } from '@shared/cqrs';

export class UpdateUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
    public readonly userName?: string,
    public readonly mail?: string,
    public readonly role?: string,
    public readonly phone?: string,
    public readonly personName?: string,
    public readonly personDni?: string,
  ) {
    super();
  }
}
