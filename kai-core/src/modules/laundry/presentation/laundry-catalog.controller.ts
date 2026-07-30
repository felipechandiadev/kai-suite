import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LaundryCatalogService } from '../application/laundry-catalog.service';
import {
  ListCatalogQueryDto,
  UpdateAttributeValueDto,
  UpdateCareTemplateDto,
  UpdateGarmentAttributeDto,
  UpdateGarmentTypeDto,
  UpsertAttributeValueDto,
  UpsertCareTemplateDto,
  UpsertGarmentAttributeDto,
  UpsertGarmentTypeDto,
} from '../application/dto/laundry-catalog.dtos';

@Controller('laundry/catalog')
export class LaundryCatalogController {
  constructor(private readonly catalogService: LaundryCatalogService) {}

  private parseIncludeInactive(raw?: string): boolean {
    return raw === 'true' || raw === '1';
  }

  // --- Garment types ---

  @Get('types')
  async listTypes(@Query() query: ListCatalogQueryDto) {
    const items = await this.catalogService.listGarmentTypes(
      this.parseIncludeInactive(query.includeInactive),
    );
    return { success: true, items };
  }

  @Post('types')
  async createType(@Body() body: UpsertGarmentTypeDto) {
    const item = await this.catalogService.createGarmentType(body);
    return { success: true, item };
  }

  @Patch('types/:id')
  async updateType(@Param('id') id: string, @Body() body: UpdateGarmentTypeDto) {
    const item = await this.catalogService.updateGarmentType(id, body);
    return { success: true, item };
  }

  @Delete('types/:id')
  async removeType(@Param('id') id: string) {
    await this.catalogService.removeGarmentType(id);
    return { success: true };
  }

  // --- Garment attributes ---

  @Get('attributes')
  async listAttributes(@Query() query: ListCatalogQueryDto) {
    const items = await this.catalogService.listGarmentAttributes(
      this.parseIncludeInactive(query.includeInactive),
    );
    return { success: true, items };
  }

  @Post('attributes')
  async createAttribute(@Body() body: UpsertGarmentAttributeDto) {
    const item = await this.catalogService.createGarmentAttribute(body);
    return { success: true, item };
  }

  @Patch('attributes/:id')
  async updateAttribute(
    @Param('id') id: string,
    @Body() body: UpdateGarmentAttributeDto,
  ) {
    const item = await this.catalogService.updateGarmentAttribute(id, body);
    return { success: true, item };
  }

  @Delete('attributes/:id')
  async removeAttribute(@Param('id') id: string) {
    await this.catalogService.removeGarmentAttribute(id);
    return { success: true };
  }

  // --- Attribute values ---

  @Post('attributes/:attributeId/values')
  async createAttributeValue(
    @Param('attributeId') attributeId: string,
    @Body() body: UpsertAttributeValueDto,
  ) {
    const item = await this.catalogService.createAttributeValue(attributeId, body);
    return { success: true, item };
  }

  @Patch('attributes/:attributeId/values/:valueId')
  async updateAttributeValue(
    @Param('attributeId') attributeId: string,
    @Param('valueId') valueId: string,
    @Body() body: UpdateAttributeValueDto,
  ) {
    const item = await this.catalogService.updateAttributeValue(
      attributeId,
      valueId,
      body,
    );
    return { success: true, item };
  }

  @Delete('attributes/:attributeId/values/:valueId')
  async removeAttributeValue(
    @Param('attributeId') attributeId: string,
    @Param('valueId') valueId: string,
  ) {
    await this.catalogService.removeAttributeValue(attributeId, valueId);
    return { success: true };
  }

  // --- Care templates ---

  @Get('care-templates')
  async listCareTemplates(@Query() query: ListCatalogQueryDto) {
    const items = await this.catalogService.listCareTemplates(
      this.parseIncludeInactive(query.includeInactive),
    );
    return { success: true, items };
  }

  @Post('care-templates')
  async createCareTemplate(@Body() body: UpsertCareTemplateDto) {
    const item = await this.catalogService.createCareTemplate(body);
    return { success: true, item };
  }

  @Patch('care-templates/:id')
  async updateCareTemplate(
    @Param('id') id: string,
    @Body() body: UpdateCareTemplateDto,
  ) {
    const item = await this.catalogService.updateCareTemplate(id, body);
    return { success: true, item };
  }

  @Delete('care-templates/:id')
  async removeCareTemplate(@Param('id') id: string) {
    await this.catalogService.removeCareTemplate(id);
    return { success: true };
  }
}
