import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipTenant } from '@common/tenant';
import { AppConfigService } from '../../../config/config.service';
import { MultimediaServiceAdapter } from '../application/services/multimedia.service.adapter';
import { UploadMultimediaDto } from '../application/dto/upload-multimedia.dto';
import { LinkMultimediaDto } from '../application/dto/link-multimedia.dto';
import { UnlinkMultimediaDto } from '../application/dto/unlink-multimedia.dto';
import { ListMultimediaAssetsDto } from '../application/dto/list-multimedia-assets.dto';
import { SetPrimaryMultimediaDto } from '../application/dto/set-primary-multimedia.dto';
import { ReorderMultimediaDto } from '../application/dto/reorder-multimedia.dto';
import { Response } from 'express';
import * as path from 'path';

@Controller('multimedia')
export class MultimediaController {
  constructor(
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly configService: AppConfigService,
  ) {}

  @Post('assets')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadMultimediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const asset = await this.multimediaService.upload({
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      entityType: body?.entityType,
      entityId: body?.entityId,
      usageType: body?.usageType,
      isPrimary: body?.isPrimary,
      attributeId: body?.attributeId,
    });

    return {
      success: true,
      data: asset,
    };
  }

  @Get('assets/:id')
  async getAsset(@Param('id') id: string) {
    const asset = await this.multimediaService.findById(id);

    if (!asset) {
      throw new BadRequestException('Multimedia asset not found');
    }

    return {
      success: true,
      data: asset,
    };
  }

  /** Archivos locales: keys planas o namespaced (`companyId/assetId/...`). */
  @SkipTenant()
  @Get('files/{*path}')
  async getLocalFile(
    @Param('path') storageKeyRaw: string | string[],
    @Res() response: Response,
  ) {
    if (this.configService.storage.strategy !== 'local') {
      throw new BadRequestException('Local storage strategy is not enabled');
    }

    const raw = Array.isArray(storageKeyRaw)
      ? storageKeyRaw.join('/')
      : String(storageKeyRaw ?? '');
    const storageKey = decodeURIComponent(raw)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) {
      throw new BadRequestException('Invalid storage key');
    }

    const root = path.resolve(this.configService.storage.local.path);
    const absolute = path.resolve(root, storageKey);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      throw new BadRequestException('Invalid storage key');
    }

    return response.sendFile(
      absolute,
      (error) => {
        if (error) {
          const statusCode: number =
            typeof (error as { statusCode?: number }).statusCode === 'number'
              ? ((error as { statusCode?: number }).statusCode as number)
              : 404;
          response.status(statusCode).json({
            success: false,
            message: 'Media file not found',
          });
        }
      },
    );
  }

  @Get('entities/:entityType/:entityId/assets')
  async listAssets(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: ListMultimediaAssetsDto,
  ) {
    const assets = await this.multimediaService.listByEntity(
      entityType,
      entityId,
      query.usageType,
      query.attributeId,
    );

    return {
      success: true,
      data: assets,
    };
  }

  @Put('entities/:entityType/:entityId/order')
  async reorderAssets(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: ReorderMultimediaDto,
  ) {
    await this.multimediaService.reorderForEntity({
      entityType,
      entityId,
      assetIds: body.assetIds,
      attributeId: body.attributeId,
    });

    return {
      success: true,
    };
  }

  @Put('entities/:entityType/:entityId/primary')
  async setPrimaryAsset(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: SetPrimaryMultimediaDto,
  ) {
    await this.multimediaService.setPrimaryForEntity({
      assetId: body.assetId,
      entityType,
      entityId,
      attributeId: body.attributeId,
    });

    return {
      success: true,
    };
  }

  @Post('assets/:id/links')
  async linkAsset(
    @Param('id') id: string,
    @Body() body: LinkMultimediaDto,
  ) {
    const link = await this.multimediaService.link({
      assetId: id,
      entityType: body.entityType,
      entityId: body.entityId,
      usageType: body.usageType,
      sortOrder: body.sortOrder ?? 0,
      isPrimary: body.isPrimary,
      attributeId: body.attributeId,
    });

    return {
      success: true,
      data: link,
    };
  }

  @Delete('assets/:id/links')
  async unlinkAsset(
    @Param('id') id: string,
    @Query() query: UnlinkMultimediaDto,
  ) {
    const result = await this.multimediaService.unlink({
      assetId: id,
      entityType: query.entityType,
      entityId: query.entityId,
      usageType: query.usageType,
      attributeId: query.attributeId,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Delete('assets/:id')
  async deleteAsset(@Param('id') id: string) {
    const result = await this.multimediaService.delete(id);

    return {
      success: true,
      data: result,
    };
  }
}