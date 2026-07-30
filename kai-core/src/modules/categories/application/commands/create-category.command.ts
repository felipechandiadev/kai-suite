import { BaseCommand } from '@shared/cqrs';

export class CreateCategoryCommand extends BaseCommand {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly description?: string,
    public readonly parentId?: string,
    public readonly sortOrder: number = 0,
    public readonly isActive: boolean = true,
    public readonly resultCenterId?: string,
  ) {
    super();
  }
}
