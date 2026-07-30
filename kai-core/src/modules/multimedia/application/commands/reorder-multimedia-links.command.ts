export class ReorderMultimediaLinksCommand {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly assetIds: string[],
    public readonly usageType?: string,
    public readonly attributeId?: string | null,
  ) {}
}
