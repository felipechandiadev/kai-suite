import { BaseCommand } from '@shared/cqrs';

export class CreatePermissionCommand extends BaseCommand {
  constructor(
    public readonly permissionId: string,
    public readonly ability: string,
    public readonly userId?: string,
    public readonly description?: string,
  ) {
    super();
  }
}
