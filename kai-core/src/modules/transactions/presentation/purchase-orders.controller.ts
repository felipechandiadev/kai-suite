import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService } from '../application/purchase-orders.service';
import { PurchaseOrderReceptionProgressService } from '../application/purchase-order-reception-progress.service';
import { CreatePurchaseOrderDto } from '../application/dto/create-purchase-order.dto';

@ApiTags('Purchase orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly receptionProgress: PurchaseOrderReceptionProgressService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear orden de compra',
    description:
      'Registra una transacción PURCHASE_ORDER. `saveAsDraft: true` crea estado DRAFT sin exigir proveedor ni líneas; sin flag, orden confirmada como antes. El almacén destino es opcional.',
  })
  async create(@Body() body: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(body);
  }

  @Get(':id/reception-progress')
  @ApiOperation({
    summary: 'Avance de recepción de una orden de compra',
    description:
      'Cantidad pedida, recibida y pendiente por variante, calculada desde los ingresos no anulados vinculados a la OC.',
  })
  async getReceptionProgress(@Param('id', ParseUUIDPipe) id: string) {
    const progress = await this.receptionProgress.getProgress(id);
    if (!progress) {
      throw new NotFoundException('Orden de compra no encontrada');
    }
    return progress;
  }
}
