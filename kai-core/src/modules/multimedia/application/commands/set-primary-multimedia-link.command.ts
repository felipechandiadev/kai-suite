export class SetPrimaryMultimediaLinkCommand {
  constructor(
    public readonly assetId: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly attributeId?: string | null,
  ) {}
}
