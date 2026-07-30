import { BaseCommand } from '@shared/cqrs';

export class UpdatePermissionCommand extends BaseCommand {
  constructor(
    public readonly permissionId: string,
    public readonly currentUserId: string,
    public readonly description?: string,
  ) {
    super();
  }
}
