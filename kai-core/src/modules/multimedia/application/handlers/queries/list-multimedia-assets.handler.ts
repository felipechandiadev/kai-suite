import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  ListMultimediaAssetsQuery,
  ListedMultimediaAsset,
} from '../../queries/list-multimedia-assets.query';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { enrichMultimediaAssetForApi } from '../../utils/resolve-multimedia-urls.util';

@QueryHandler(ListMultimediaAssetsQuery)
export class ListMultimediaAssetsQueryHandler
  implements IQueryHandler<ListMultimediaAssetsQuery, ListedMultimediaAsset[]>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  execute(query: ListMultimediaAssetsQuery): Promise<ListedMultimediaAsset[]> {
    return this.repository
      .listAssetsByEntity({
        entityType: query.entityType,
        entityId: query.entityId,
        usageType: query.usageType,
        attributeId: query.attributeId,
      })
      .then((assets) =>
        assets.map((a) => enrichMultimediaAssetForApi(a) as ListedMultimediaAsset),
      );
  }
}