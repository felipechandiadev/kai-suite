import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ReceptionsService } from '../application/receptions.service';
import { CreateReceptionDto } from '../application/dto/create-reception.dto';

@Controller('receptions')
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 25;
    const o = offset ? parseInt(offset, 10) : 0;
    const term = typeof search === 'string' ? search.trim() : '';
    return this.receptionsService.search({
      limit: l,
      offset: o,
      search: term || undefined,
    });
  }

  @Get('resolve')
  async resolveBySupplierDocument(
    @Query('supplierId') supplierId?: string,
    @Query('documentRef') documentRef?: string,
  ) {
    const sid = String(supplierId ?? '').trim();
    const ref = String(documentRef ?? '').trim();
    if (!sid || !ref) {
      throw new BadRequestException('supplierId and documentRef are required');
    }
    return this.receptionsService.getBySupplierDocumentRef(sid, ref);
  }

  /** Devolución de compra: localizar recepción por folio interno (recepción, factura o boleta). */
  @Get('resolve-for-return')
  async resolveForPurchaseReturn(
    @Query('source') source?: string,
    @Query('folio') folio?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const src = String(source ?? '').trim().toLowerCase();
    if (src !== 'reception' && src !== 'invoice' && src !== 'receipt') {
      throw new BadRequestException(
        'source must be reception, invoice or receipt',
      );
    }
    const f = String(folio ?? '').trim();
    if (!f) {
      throw new BadRequestException('folio is required');
    }
    const sid =
      typeof supplierId === 'string' && supplierId.trim()
        ? supplierId.trim()
        : undefined;
    return this.receptionsService.resolveForPurchaseReturn({
      source: src as 'reception' | 'invoice' | 'receipt',
      folio: f,
      supplierId: sid,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.receptionsService.getById(id);
  }

  @Post()
  async create(@Body() body: CreateReceptionDto) {
    return this.receptionsService.create(body);
  }

  @Post('direct')
  async createDirect(@Body() body: CreateReceptionDto) {
    return this.receptionsService.createDirect(body);
  }

  @Post('from-purchase-order')
  async createFromPurchaseOrder(@Body() body: CreateReceptionDto) {
    return this.receptionsService.createFromPurchaseOrder(body);
  }
}
