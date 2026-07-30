import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import { UploadMultimediaCommand } from '../commands/upload-multimedia.command';
import { DeleteMultimediaCommand } from '../commands/delete-multimedia.command';
import { LinkMultimediaCommand } from '../commands/link-multimedia.command';
import { UnlinkMultimediaCommand } from '../commands/unlink-multimedia.command';
import { GetMultimediaAssetQuery } from '../queries/get-multimedia-asset.query';
import { ListMultimediaAssetsQuery } from '../queries/list-multimedia-assets.query';
import { ListMultimediaAssetsByEntityIdsQuery } from '../queries/list-multimedia-assets-by-entity-ids.query';
import { SetPrimaryMultimediaLinkCommand } from '../commands/set-primary-multimedia-link.command';
import { ReorderMultimediaLinksCommand } from '../commands/reorder-multimedia-links.command';

@Injectable()
export class MultimediaServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  upload(params: {
    file: {
      buffer: Buffer;
      originalName: string;
      mimeType: string;
      size: number;
    };
    entityType?: string;
    entityId?: string;
    usageType?: string;
    isPrimary?: boolean;
    metadata?: Record<string, unknown>;
    attributeId?: string | null;
  }) {
    return this.commandBus.execute(
      new UploadMultimediaCommand(
        params.file,
        params.entityType,
        params.entityId,
        params.usageType,
        params.isPrimary,
        params.metadata,
        params.attributeId,
      ),
    );
  }

  delete(assetId: string) {
    return this.commandBus.execute(new DeleteMultimediaCommand(assetId));
  }

  link(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
    sortOrder?: number;
    isPrimary?: boolean;
    metadata?: Record<string, unknown>;
    attributeId?: string | null;
  }) {
    return this.commandBus.execute(
      new LinkMultimediaCommand(
        params.assetId,
        params.entityType,
        params.entityId,
        params.usageType,
        params.sortOrder,
        params.isPrimary,
        params.metadata,
        params.attributeId,
      ),
    );
  }

  unlink(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }) {
    return this.commandBus.execute(
      new UnlinkMultimediaCommand(
        params.assetId,
        params.entityType,
        params.entityId,
        params.usageType,
        params.attributeId,
      ),
    );
  }

  findById(assetId: string) {
    return this.queryBus.execute(new GetMultimediaAssetQuery(assetId));
  }

  listByEntity(
    entityType: string,
    entityId: string,
    usageType?: string,
    attributeId?: string | null,
  ) {
    return this.queryBus.execute(
      new ListMultimediaAssetsQuery(entityType, entityId, usageType, attributeId),
    );
  }

  /** Una consulta para varias entidades (p. ej. todas las variantes de un listado de productos). */
  listByEntityIds(
    entityType: string,
    entityIds: string[],
    usageType?: string,
    attributeScope: 'general' | 'all' = 'general',
  ): Promise<Record<string, MultimediaAsset[]>> {
    return this.queryBus.execute(
      new ListMultimediaAssetsByEntityIdsQuery(
        entityType,
        entityIds,
        usageType,
        attributeScope,
      ),
    );
  }

  setPrimaryForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    attributeId?: string | null;
  }) {
    return this.commandBus.execute(
      new SetPrimaryMultimediaLinkCommand(
        params.assetId,
        params.entityType,
        params.entityId,
        params.attributeId,
      ),
    );
  }

  reorderForEntity(params: {
    entityType: string;
    entityId: string;
    assetIds: string[];
    usageType?: string;
    attributeId?: string | null;
  }) {
    return this.commandBus.execute(
      new ReorderMultimediaLinksCommand(
        params.entityType,
        params.entityId,
        params.assetIds,
        params.usageType,
        params.attributeId,
      ),
    );
  }
}