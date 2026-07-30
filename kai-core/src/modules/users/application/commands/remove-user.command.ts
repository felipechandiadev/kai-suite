import { BaseCommand } from '@shared/cqrs';

export class RemoveUserCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
