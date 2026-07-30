import { BaseCommand } from '@shared/cqrs';

export class ChangeUserPasswordCommand extends BaseCommand {
  constructor(
    public readonly userId: string,
    public readonly currentUserId: string,
    public readonly newPassword: string,
  ) {
    super();
  }
}
