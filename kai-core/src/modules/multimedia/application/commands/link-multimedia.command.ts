import { BaseCommand } from '@shared/cqrs';

export class LinkMultimediaCommand extends BaseCommand {
  constructor(
    public readonly assetId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly usageType: string = 'default',
    public readonly sortOrder: number = 0,
    public readonly isPrimary: boolean = false,
    public readonly metadata?: Record<string, unknown>,
    public readonly attributeId?: string | null,
  ) {
    super();
  }
}