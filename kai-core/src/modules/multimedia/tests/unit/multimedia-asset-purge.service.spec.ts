import { MultimediaAssetPurgeService } from '../../application/services/multimedia-asset-purge.service';
import type { MultimediaRepositoryPort } from '../../application/ports/multimedia.repository.port';
import type { MultimediaStorageRegistry } from '../../application/services/multimedia-storage.registry';
import type { MultimediaAsset } from '../../domain/multimedia-asset.entity';

describe('MultimediaAssetPurgeService', () => {
  it('deletes original and all variant storage keys', async () => {
    const deleted: string[] = [];
    const storage = {
      delete: jest.fn(async (key: string) => {
        deleted.push(key);
      }),
    };
    const repository: Pick<
      MultimediaRepositoryPort,
      'listVariantsByAssetId' | 'deleteAsset' | 'findAssetById'
    > = {
      listVariantsByAssetId: jest.fn(),
      deleteAsset: jest.fn(),
      findAssetById: jest.fn(),
    };
    const registry = {
      forProvider: jest.fn(() => storage),
    } as unknown as MultimediaStorageRegistry;

    const service = new MultimediaAssetPurgeService(
      repository as MultimediaRepositoryPort,
      registry,
    );

    const asset = {
      id: 'asset-1',
      storageKey: 'co/asset-1/original.jpg',
      storageProvider: 'local',
      variants: [
        { storageKey: 'co/asset-1/v/thumb.webp' },
        { storageKey: 'co/asset-1/v/full.webp' },
      ],
    } as MultimediaAsset;

    await service.purgeAsset(asset);

    expect(deleted).toEqual([
      'co/asset-1/original.jpg',
      'co/asset-1/v/thumb.webp',
      'co/asset-1/v/full.webp',
    ]);
    expect(repository.deleteAsset).toHaveBeenCalledWith('asset-1');
  });
});
