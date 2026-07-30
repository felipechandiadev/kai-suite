import { BadRequestException } from '@nestjs/common';
import { MultimediaController } from '@modules/multimedia/presentation/multimedia.controller';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AppConfigService } from '../../../../../src/config/config.service';

describe('MultimediaController', () => {
  let controller: MultimediaController;
  let multimediaService: {
    upload: jest.Mock;
    findById: jest.Mock;
    listByEntity: jest.Mock;
    link: jest.Mock;
    unlink: jest.Mock;
    delete: jest.Mock;
  };
  let configService: {
    storage: {
      strategy: 'local' | 'cloudflare';
      local: { path: string };
    };
  };

  beforeEach(() => {
    multimediaService = {
      upload: jest.fn(),
      findById: jest.fn(),
      listByEntity: jest.fn(),
      link: jest.fn(),
      unlink: jest.fn(),
      delete: jest.fn(),
    };
    configService = {
      storage: {
        strategy: 'local',
        local: { path: '/tmp/media' },
      },
    };

    controller = new MultimediaController(
      multimediaService as unknown as MultimediaServiceAdapter,
      configService as unknown as AppConfigService,
    );
  });

  it('should upload an asset through the multimedia service', async () => {
    multimediaService.upload.mockResolvedValueOnce({ id: 'asset-1' });

    const result = await controller.uploadAsset(
      {
        buffer: Buffer.from('file'),
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 4,
      } as Express.Multer.File,
      {
        entityType: 'product',
        entityId: 'product-1',
        usageType: 'primary-image',
        isPrimary: true,
      },
    );

    expect(multimediaService.upload).toHaveBeenCalledWith({
      file: {
        buffer: expect.any(Buffer),
        originalName: 'photo.png',
        mimeType: 'image/png',
        size: 4,
      },
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      isPrimary: true,
    });
    expect(result).toEqual({
      success: true,
      data: { id: 'asset-1' },
    });
  });

  it('should reject uploads without a file', async () => {
    await expect(controller.uploadAsset(undefined, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return an asset by id', async () => {
    multimediaService.findById.mockResolvedValueOnce({ id: 'asset-1' });

    const result = await controller.getAsset('asset-1');

    expect(multimediaService.findById).toHaveBeenCalledWith('asset-1');
    expect(result).toEqual({ success: true, data: { id: 'asset-1' } });
  });

  it('should reject missing assets', async () => {
    multimediaService.findById.mockResolvedValueOnce(null);

    await expect(controller.getAsset('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should list, link, unlink, and delete assets', async () => {
    multimediaService.listByEntity.mockResolvedValueOnce([{ id: 'asset-1' }]);
    multimediaService.link.mockResolvedValueOnce({ id: 'link-1' });
    multimediaService.unlink.mockResolvedValueOnce({ success: true });
    multimediaService.delete.mockResolvedValueOnce({ success: true });

    const listed = await controller.listAssets('product', 'product-1', {
      usageType: 'primary-image',
    });
    const linked = await controller.linkAsset('asset-1', {
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      sortOrder: 2,
      isPrimary: false,
    });
    const unlinked = await controller.unlinkAsset('asset-1', {
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
    });
    const deleted = await controller.deleteAsset('asset-1');

    expect(listed).toEqual({ success: true, data: [{ id: 'asset-1' }] });
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
      sortOrder: 2,
      isPrimary: false,
    });
    expect(linked).toEqual({ success: true, data: { id: 'link-1' } });
    expect(multimediaService.unlink).toHaveBeenCalledWith({
      assetId: 'asset-1',
      entityType: 'product',
      entityId: 'product-1',
      usageType: 'primary-image',
    });
    expect(unlinked).toEqual({ success: true, data: { success: true } });
    expect(deleted).toEqual({ success: true, data: { success: true } });
  });

  it('should reject invalid local file requests before touching sendFile', async () => {
    const response = {
      sendFile: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await expect(
      controller.getLocalFile('../escape.png', response as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(response.sendFile).not.toHaveBeenCalled();
  });

  it('should reject file serving when local storage is disabled', async () => {
    configService.storage.strategy = 'cloudflare';
    const response = {
      sendFile: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await expect(
      controller.getLocalFile('asset.png', response as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});