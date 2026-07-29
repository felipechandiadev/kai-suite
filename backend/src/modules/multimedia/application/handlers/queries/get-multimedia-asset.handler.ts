import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMultimediaAssetQuery } from '../../queries/get-multimedia-asset.query';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';
import { enrichMultimediaAssetForApi } from '../../utils/resolve-multimedia-urls.util';

@QueryHandler(GetMultimediaAssetQuery)
export class GetMultimediaAssetQueryHandler
  implements IQueryHandler<GetMultimediaAssetQuery, MultimediaAsset | null>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  async execute(
    query: GetMultimediaAssetQuery,
  ): Promise<MultimediaAsset | null> {
    const asset = await this.repository.findAssetById(query.assetId);
    if (!asset) return null;
    return enrichMultimediaAssetForApi(asset) as MultimediaAsset;
  }
}
