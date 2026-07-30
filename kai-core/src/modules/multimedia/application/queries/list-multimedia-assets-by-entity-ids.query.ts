import { BaseQuery } from '@shared/cqrs';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';

export type MultimediaAssetsByEntityIdMap = Record<string, MultimediaAsset[]>;

export class ListMultimediaAssetsByEntityIdsQuery extends BaseQuery<MultimediaAssetsByEntityIdMap> {
  constructor(
    public readonly entityType: string,
    public readonly entityIds: string[],
    public readonly usageType?: string,
    public readonly attributeScope: 'general' | 'all' = 'general',
  ) {
    super();
  }
}
