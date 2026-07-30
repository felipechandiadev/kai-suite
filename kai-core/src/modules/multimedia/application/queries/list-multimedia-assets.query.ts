import { BaseQuery } from '@shared/cqrs';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';

export type ListedMultimediaAsset = MultimediaAsset & {
  isPrimary: boolean;
  sortOrder: number;
  linkId: string;
};

export class ListMultimediaAssetsQuery extends BaseQuery<ListedMultimediaAsset[]> {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly usageType?: string,
    public readonly attributeId?: string | null,
  ) {
    super();
  }
}