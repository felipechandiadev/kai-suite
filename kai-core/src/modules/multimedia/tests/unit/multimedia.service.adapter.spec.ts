import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { UploadMultimediaCommand } from '@modules/multimedia/application/commands/upload-multimedia.command';
import { DeleteMultimediaCommand } from '@modules/multimedia/application/commands/delete-multimedia.command';
import { LinkMultimediaCommand } from '@modules/multimedia/application/commands/link-multimedia.command';
import { UnlinkMultimediaCommand } from '@modules/multimedia/application/commands/unlink-multimedia.command';
import { GetMultimediaAssetQuery } from '@modules/multimedia/application/queries/get-multimedia-asset.query';
import { ListMultimediaAssetsQuery } from '@modules/multimedia/application/queries/list-multimedia-assets.query';
import { ListMultimediaAssetsByEntityIdsQuery } from '@modules/multimedia/application/queries/list-multimedia-assets-by-entity-ids.query';

describe('MultimediaServiceAdapter', () => {
  let adapter: MultimediaServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    adapter = new MultimediaServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch upload command', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'asset-1' });

    const result = await adapter.upload({
      file: {
        buffer: Buffer.from('file'),
        originalName: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 4,
      },
      entityType: 'operational-expense',
      entityId: 'oe-1',
      usageType: 'attachment',
      isPrimary: false,
    });

    const command = commandBus.execute.mock.calls[0][0] as UploadMultimediaCommand;
    expect(command).toBeInstanceOf(UploadMultimediaCommand);
    expect(command).toMatchObject({
      entityType: 'operational-expense',
      entityId: 'oe-1',
      usageType: 'attachment',
      isPrimary: false,
    });
    expect(result).toEqual({ id: 'asset-1' });
  });

  it('should dispatch link and unlink commands', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'link-1' }).mockResolvedValueOnce({ success: true });

    await adapter.link({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
    await adapter.unlink({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
    });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(LinkMultimediaCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
    expect(commandBus.execute.mock.calls[1][0]).toBeInstanceOf(UnlinkMultimediaCommand);
    expect(commandBus.execute.mock.calls[1][0]).toMatchObject({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
    });
  });

  it('should dispatch read queries and delete command', async () => {
    queryBus.execute.mockResolvedValueOnce({ id: 'asset-1' }).mockResolvedValueOnce([{ id: 'asset-1' }]);
    commandBus.execute.mockResolvedValueOnce({ success: true });

    const found = await adapter.findById('asset-1');
    const listed = await adapter.listByEntity('category', 'cat-1', 'primary-image');
    const deleted = await adapter.delete('asset-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetMultimediaAssetQuery);
    expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(ListMultimediaAssetsQuery);
    expect(queryBus.execute.mock.calls[1][0]).toMatchObject({
      entityType: 'category',
      entityId: 'cat-1',
      usageType: 'primary-image',
    });
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(DeleteMultimediaCommand);
    expect(found).toEqual({ id: 'asset-1' });
    expect(listed).toEqual([{ id: 'asset-1' }]);
    expect(deleted).toEqual({ success: true });
  });

  it('should dispatch list-by-entity-ids query', async () => {
    queryBus.execute.mockResolvedValueOnce({ 'var-1': [{ id: 'a1', publicUrl: '/x', mimeType: 'image/png', kind: 'image' }] });

    const map = await adapter.listByEntityIds('product-variant', ['var-1', 'var-2']);

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(ListMultimediaAssetsByEntityIdsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      entityType: 'product-variant',
      entityIds: ['var-1', 'var-2'],
      usageType: undefined,
      attributeScope: 'general',
    });
    expect(map).toEqual({ 'var-1': [{ id: 'a1', publicUrl: '/x', mimeType: 'image/png', kind: 'image' }] });
  });
});