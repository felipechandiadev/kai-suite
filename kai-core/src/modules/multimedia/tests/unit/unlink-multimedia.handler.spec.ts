import { UnlinkMultimediaCommandHandler } from '@modules/multimedia/application/handlers/commands/unlink-multimedia.handler';
import { UnlinkMultimediaCommand } from '@modules/multimedia/application/commands/unlink-multimedia.command';
import { MultimediaAssetPurgeService } from '@modules/multimedia/application/services/multimedia-asset-purge.service';

describe('UnlinkMultimediaCommandHandler', () => {
  const asset = {
    id: 'asset-1',
    storageKey: 'file.png',
    storageProvider: 'local' as const,
  };

  let repository: {
    findAssetById: jest.Mock;
    removeLink: jest.Mock;
    countLinksForAsset: jest.Mock;
  };
  let assetPurge: { purgeAsset: jest.Mock };
  let handler: UnlinkMultimediaCommandHandler;

  beforeEach(() => {
    repository = {
      findAssetById: jest.fn().mockResolvedValue(asset),
      removeLink: jest.fn().mockResolvedValue(undefined),
      countLinksForAsset: jest.fn(),
    };
    assetPurge = { purgeAsset: jest.fn().mockResolvedValue(undefined) };
    handler = new UnlinkMultimediaCommandHandler(
      repository as never,
      assetPurge as unknown as MultimediaAssetPurgeService,
    );
  });

  it('purges file and asset when no links remain', async () => {
    repository.countLinksForAsset.mockResolvedValueOnce(0);

    await handler.execute(
      new UnlinkMultimediaCommand('asset-1', 'product', 'prod-1', 'default'),
    );

    expect(repository.removeLink).toHaveBeenCalled();
    expect(assetPurge.purgeAsset).toHaveBeenCalledWith(asset);
  });

  it('does not purge when other links remain', async () => {
    repository.countLinksForAsset.mockResolvedValueOnce(2);

    await handler.execute(
      new UnlinkMultimediaCommand('asset-1', 'product', 'prod-1', 'default'),
    );

    expect(repository.removeLink).toHaveBeenCalled();
    expect(assetPurge.purgeAsset).not.toHaveBeenCalled();
  });
});
