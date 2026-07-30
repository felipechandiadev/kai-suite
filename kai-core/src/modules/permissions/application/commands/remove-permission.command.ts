import { BaseCommand } from '@shared/cqrs';

export class RemovePermissionCommand extends BaseCommand {
  constructor(
    public readonly permissionId: string,
    public readonly currentUserId: string,
  ) {
    super();
  }
}
