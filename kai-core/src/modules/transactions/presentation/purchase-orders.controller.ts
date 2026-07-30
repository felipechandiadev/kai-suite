import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService } from '../application/purchase-orders.service';
import { CreatePurchaseOrderDto } from '../application/dto/create-purchase-order.dto';

@ApiTags('Purchase orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear orden de compra',
    description:
      'Registra una transacción PURCHASE_ORDER. `saveAsDraft: true` crea estado DRAFT sin exigir proveedor ni líneas; sin flag, orden confirmada como antes. El almacén destino es opcional.',
  })
  async create(@Body() body: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(body);
  }
}
