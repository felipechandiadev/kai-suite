import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { CustomersServiceAdapter } from '../application/customers.service.adapter';
import { CreateCustomerDto } from '../application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../application/dto/update-customer.dto';
import { SearchCustomersDto } from '../application/dto/search-customers.dto';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { CustomerPaymentSourcesService } from '../application/customer-payment-sources.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersServiceAdapter,
    private readonly installmentService: InstallmentService,
    private readonly customerPaymentSourcesService: CustomerPaymentSourcesService,
  ) {}

  @Get('search')
  async search(@Query() searchDto: SearchCustomersDto) {
    return this.customersService.search(searchDto);
  }

  @Get()
  async list(@Query() searchDto: SearchCustomersDto) {
    return this.customersService.search(searchDto);
  }

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }

  @Get(':id/pending-payments')
  async getPendingPayments(@Param('id') id: string) {
    return this.customersService.getPendingPayments(id);
  }

  @Get(':id/pending-quotas')
  async getPendingQuotas(@Param('id') id: string) {
    const result = await this.installmentService.getAccountsReceivable({
      customerId: id,
      includePaid: false,
      page: 1,
      pageSize: 200,
    });

    const quotas = (result.rows ?? []).map((row) => ({
      id: row.id,
      transactionId: row.saleTransactionId,
      documentNumber: row.documentNumber,
      amount: Number(row.pendingAmount ?? row.amount ?? 0),
      dueDate: row.dueDate,
      createdAt: row.createdAt,
    }));

    return { success: true, quotas };
  }

  @Get(':id/purchases')
  async getPurchases(@Param('id') id: string) {
    const purchases = await this.customersService.getPurchases(id);
    return { success: true, purchases };
  }

  @Get(':id/purchases/:status')
  async getPurchasesByStatus(
    @Param('id') id: string,
    @Param('status') status: string,
  ) {
    const purchases = await this.customersService.getPurchases(id, status);
    return { success: true, purchases };
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    return this.customersService.getPayments(id);
  }

  @Get(':id/customer-returns')
  async getCustomerReturns(@Param('id') id: string) {
    const returns =
      await this.customerPaymentSourcesService.listReturnsForCustomer(id);
    return { success: true, returns };
  }

  @Get(':id/customer-credit-notes')
  async getCustomerCreditNotes(@Param('id') id: string) {
    const creditNotes =
      await this.customerPaymentSourcesService.listAllCreditNotesForCustomer(
        id,
      );
    return { success: true, creditNotes };
  }

  @Get(':id/pos-payment-sources')
  async getPosPaymentSources(@Param('id') id: string) {
    const sources = await this.customerPaymentSourcesService.listForCustomer(id);
    return { success: true, ...sources };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { customer: await this.customersService.findOne(id) };
  }
}
