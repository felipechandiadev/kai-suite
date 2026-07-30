import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  AccountingRulesServiceAdapter,
  CreateAccountingRuleDto,
  UpdateAccountingRuleDto,
} from '@modules/accounting-rules/application';

@Controller('accounting/rules')
export class AccountingRulesController {
  constructor(private service: AccountingRulesServiceAdapter) {}

  /**
   * POST /accounting/rules
   * Crear una nueva regla contable
   */
  @Post()
  async create(@Body() dto: CreateAccountingRuleDto) {
    return this.service.create(dto);
  }

  /**
   * GET /accounting/rules?companyId=xxx
   * Listar todas las reglas de una empresa
   */
  @Get()
  async findAll(@Query('companyId') companyId: string) {
    if (!companyId) {
      return { error: 'companyId is required' };
    }
    return this.service.findAll(companyId);
  }

  /**
   * GET /accounting/rules/:id
   * Obtener una regla específica
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /**
   * PUT /accounting/rules/:id
   * Actualizar una regla
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAccountingRuleDto) {
    return this.service.update(id, dto);
  }

  /**
   * DELETE /accounting/rules/:id
   * Desactivar una regla (soft delete)
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.deactivate(id);
    return { message: 'Rule deactivated' };
  }

  /**
   * GET /accounting/rules/type/:transactionType?companyId=xxx
   * Listar reglas por tipo de transacción
   */
  @Get('type/:transactionType')
  async findByTransactionType(
    @Param('transactionType') transactionType: string,
    @Query('companyId') companyId: string,
  ) {
    if (!companyId) {
      return { error: 'companyId is required' };
    }
    return this.service.findByTransactionType(companyId, transactionType);
  }
}
