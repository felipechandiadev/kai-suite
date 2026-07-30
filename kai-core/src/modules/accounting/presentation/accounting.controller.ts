import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccountingService } from '../application/accounting.service';
import { BuildLedgerDto } from '../application/dto/build-ledger.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  /**
   * GET /api/accounting/hierarchy
   *
   * Retorna la jerarquía de cuentas contables
   *
   * Query params:
   * - includeInactive: boolean (opcional)
   * - filters: object (opcional, ignorado)
   * - page: number (opcional, ignorado)
   * - pageSize: number (opcional, ignorado)
   */
  @Get('hierarchy')
  async getHierarchy(
    @Query('includeInactive') includeInactive?: string,
    @Query('filters') filters?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // Ignorar filters, page, pageSize - son enviados por frontend pero no se usan en este endpoint
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.accountingService.getHierarchy(include);
  }

  @Get('ledger')
  async getLedgerData(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.accountingService.getLedgerData(include);
  }

  @Post('ledger')
  async buildLedger(@Body() dto: BuildLedgerDto) {
    return this.accountingService.buildLedger(dto);
  }
}
