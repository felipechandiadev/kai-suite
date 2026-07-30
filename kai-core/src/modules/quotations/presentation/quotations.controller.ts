import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
} from '@common/tenant';
import { QuotationsService } from '../application/quotations.service';
import { ConvertQuotationUseCase } from '../application/commands/convert-quotation.usecase';
import {
  CancelQuotationDto,
  ConvertQuotationDto,
  CreateQuotationDto,
  ListQuotationsQueryDto,
} from '../application/dto/quotation.dtos';

@Controller('quotations')
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly convertUseCase: ConvertQuotationUseCase,
  ) {}

  @Get()
  async list(
    @Query() q: ListQuotationsQueryDto,
    @CurrentCompany() companyId: string,
  ) {
    const result = await this.quotationsService.list(companyId, q);
    return { success: true, ...result };
  }

  /**
   * Búsqueda por folio para POS / admin (`COT2600001`).
   * Devuelve `success:true, quotation:null` si no existe (en lugar de 404)
   * para que el cliente pueda mostrar feedback amigable.
   */
  @Get('by-document-number/:documentNumber')
  async getByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
    @CurrentCompany() companyId: string,
  ) {
    const quotation = await this.quotationsService.findByDocumentNumber(
      companyId,
      documentNumber.trim(),
    );
    return { success: true, quotation };
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentCompany() companyId: string,
  ) {
    const quotation = await this.quotationsService.getById(companyId, id);
    return { success: true, quotation };
  }

  @Post()
  async create(
    @Body() body: CreateQuotationDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const quotation = await this.quotationsService.create(
      companyId,
      user.id,
      body,
    );
    return { success: true, quotation };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: CancelQuotationDto,
    @CurrentCompany() companyId: string,
  ) {
    const quotation = await this.quotationsService.cancel(companyId, id, body);
    return { success: true, quotation };
  }

  @Post(':id/convert')
  async convert(
    @Param('id') id: string,
    @Body() body: ConvertQuotationDto,
    @CurrentCompany() companyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.convertUseCase.execute(
      companyId,
      user.id,
      id,
      body,
    );
    return { success: true, ...result };
  }
}
