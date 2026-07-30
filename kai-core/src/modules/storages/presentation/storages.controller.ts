import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StoragesService } from '../application/storages.service';
import { CreateStorageDto, UpdateStorageDto } from '../application/dto/storage.dto';

@Controller('storages')
export class StoragesController {
  constructor(private readonly storagesService: StoragesService) {}

  @Get()
  async getStorages(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.storagesService.getAllStorages(include);
  }

  @Get(':id')
  async getStorageById(@Param('id') id: string) {
    const storage = await this.storagesService.getStorageById(id);
    if (!storage) {
      return { success: false, message: 'Storage not found', statusCode: 404 };
    }
    return storage;
  }

  @Post()
  async createStorage(@Body() data: CreateStorageDto) {
    return this.storagesService.createStorage(data);
  }

  @Put(':id')
  async updateStorage(@Param('id') id: string, @Body() data: UpdateStorageDto) {
    return this.storagesService.updateStorage(id, data);
  }

  @Delete(':id')
  async deleteStorage(@Param('id') id: string) {
    return this.storagesService.deleteStorage(id);
  }
}
