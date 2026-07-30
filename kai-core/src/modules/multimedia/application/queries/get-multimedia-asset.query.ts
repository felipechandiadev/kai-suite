import { BaseQuery } from '@shared/cqrs';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';

export class GetMultimediaAssetQuery extends BaseQuery<MultimediaAsset | null> {
  constructor(public readonly assetId: string) {
    super();
  }
}