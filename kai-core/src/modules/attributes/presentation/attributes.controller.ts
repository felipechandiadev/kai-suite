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
import { AttributesService } from '../application/attributes.service';

@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  async getAttributes(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.attributesService.getAllAttributes(include);
  }

  @Get(':id')
  async getAttributeById(@Param('id') id: string) {
    const attribute = await this.attributesService.getAttributeById(id);
    if (!attribute) {
      return {
        success: false,
        message: 'Attribute not found',
        statusCode: 404,
      };
    }
    return attribute;
  }

  @Post()
  async createAttribute(
    @Body()
    data: {
      name: string;
      description?: string | null;
      options: string[];
    },
  ) {
    return this.attributesService.createAttribute(data);
  }

  @Put(':id')
  async updateAttribute(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      description: string | null;
      options: string[];
      isActive: boolean;
    }>,
  ) {
    return this.attributesService.updateAttribute(id, data);
  }

  @Delete(':id')
  async deleteAttribute(@Param('id') id: string) {
    return this.attributesService.deleteAttribute(id);
  }
}
