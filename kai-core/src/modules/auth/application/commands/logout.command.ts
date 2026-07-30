import { BaseCommand } from '@shared/cqrs';

export class LogoutCommand extends BaseCommand {
  constructor(public readonly userId: string) {
    super();
  }
}
