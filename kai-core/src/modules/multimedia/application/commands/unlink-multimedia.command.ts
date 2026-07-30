import { BaseCommand } from '@shared/cqrs';

export class UnlinkMultimediaCommand extends BaseCommand {
  constructor(
    public readonly assetId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly usageType?: string,
    public readonly attributeId?: string | null,
  ) {
    super();
  }
}