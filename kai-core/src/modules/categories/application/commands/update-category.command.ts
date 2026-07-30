import { BaseCommand } from '@shared/cqrs';

export class UpdateCategoryCommand extends BaseCommand {
  constructor(
    public readonly categoryId: string,
    public readonly currentUserId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly isActive?: boolean,
    public readonly sortOrder?: number,
    public readonly parentId?: string,
  ) {
    super();
  }
}
