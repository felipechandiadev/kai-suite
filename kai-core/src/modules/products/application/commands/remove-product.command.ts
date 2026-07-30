import { BaseCommand } from '@shared/cqrs';

export class RemoveProductCommand extends BaseCommand {
  constructor(
    public readonly productId: string,
    public readonly currentUserId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
