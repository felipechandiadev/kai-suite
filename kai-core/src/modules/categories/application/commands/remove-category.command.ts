import { BaseCommand } from '@shared/cqrs';

export class RemoveCategoryCommand extends BaseCommand {
  constructor(
    public readonly categoryId: string,
    public readonly currentUserId: string,
    public readonly reason?: string,
  ) {
    super();
  }
}
