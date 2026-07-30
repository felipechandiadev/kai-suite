import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { PromotionsService } from '../application/promotions.service';

interface RedeemCodeBody {
  code: string;
  branchId: string;
  pointOfSaleId: string;
}

/**
 * Endpoints "efectivos" usados por el POS para conocer y validar las
 * promociones que aplican en su contexto (empresa + sucursal + POS).
 */
@Controller('pos/me/promotions')
export class PromotionsPosController {
  constructor(private readonly service: PromotionsService) {}

  /**
   * Lista las promociones aplicables (AUTO + MANUAL) en la sucursal/POS
   * actual. Las `CODE_ENTRY` quedan fuera; se descubren vía `redeem`.
   */
  @Get()
  async listEffective(
    @CurrentCompany() companyId: string,
    @Query('branchId') branchId: string,
    @Query('pointOfSaleId') pointOfSaleId: string,
  ) {
    if (!branchId || !pointOfSaleId) {
      throw new BadRequestException(
        '`branchId` y `pointOfSaleId` son requeridos',
      );
    }
    const promotions = await this.service.findEffective(
      companyId,
      branchId,
      pointOfSaleId,
      false,
    );
    return { success: true, promotions };
  }

  @Post('redeem')
  async redeem(
    @Body() body: RedeemCodeBody,
    @CurrentCompany() companyId: string,
  ) {
    if (!body?.code || !body.code.trim()) {
      throw new BadRequestException('`code` es requerido');
    }
    if (!body.branchId || !body.pointOfSaleId) {
      throw new BadRequestException(
        '`branchId` y `pointOfSaleId` son requeridos',
      );
    }
    const promotion = await this.service.findEffectiveByRedemptionCode(
      companyId,
      body.branchId,
      body.pointOfSaleId,
      body.code,
    );
    if (!promotion) {
      return {
        success: false,
        message: 'Cupón inválido o no aplica en este punto de venta',
      };
    }
    return { success: true, promotion };
  }
}
