import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { EShopOrderStatusService } from './eshop-order-status.service';
import { CustomersService } from '@modules/customers/application/customers.service';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import type { EshopCustomerSession } from './eshop-customer-auth.service';

@Injectable()
export class EshopCustomerMeService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    private readonly orderStatus: EShopOrderStatusService,
    private readonly customersService: CustomersService,
    private readonly installmentService: InstallmentService,
    private readonly companiesService: CompaniesService,
  ) {}

  async getSummary(companyId: string, session: EshopCustomerSession) {
    const orders = await this.orderStatus.listOrdersForCustomer(
      companyId,
      session.customerId,
      { page: 1, limit: 5 },
    );
    const openBackorders = orders.data.filter(
      (o) =>
        o.transactionType === 'BACKORDER' &&
        String(o.backorderReservationStatus ?? 'OPEN').toUpperCase() === 'OPEN',
    );
    let debtSummary: { pendingCount: number; totalDue: number } | null = null;
    if (session.emailVerified) {
      const icc = await this.companiesService.getInternalCustomerCreditSettings(companyId);
      const settings = await this.companiesService.getEShopFlatSettings(companyId);
      if (icc.enabled && settings.eShopShowDebtsInPortal !== false) {
        const debts = await this.getDebts(companyId, session);
        debtSummary = {
          pendingCount: debts.quotas.length,
          totalDue: debts.totalDue,
        };
      }
    }
    return {
      profile: await this.getProfile(companyId, session),
      recentOrders: orders.data,
      openBackordersCount: openBackorders.length,
      debtSummary,
    };
  }

  async getProfile(companyId: string, session: EshopCustomerSession) {
    const customer = await this.customerRepo.findOne({
      where: { id: session.customerId, companyId },
      relations: ['person'],
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    const person = customer.person;
    return {
      customerId: customer.id,
      email: session.email,
      emailVerified: session.emailVerified,
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? null,
      phone: person?.phone ?? null,
      address: person?.address ?? null,
      documentNumber: person?.documentNumber ?? null,
      documentType: person?.documentType ?? null,
      creditLimit: Number(customer.creditLimit) || 0,
      currentBalance: Number(customer.currentBalance) || 0,
    };
  }

  async updateProfile(
    companyId: string,
    session: EshopCustomerSession,
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
    },
  ) {
    const customer = await this.customerRepo.findOne({
      where: { id: session.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    const person = await this.personRepo.findOne({
      where: { id: customer.personId },
    });
    if (!person) throw new NotFoundException('Persona no encontrada');
    if (body.firstName?.trim()) person.firstName = body.firstName.trim();
    if (body.lastName !== undefined) person.lastName = body.lastName?.trim() || undefined;
    if (body.phone !== undefined) person.phone = body.phone?.trim() || undefined;
    if (body.address !== undefined) person.address = body.address?.trim() || undefined;
    await this.personRepo.save(person);
    return this.getProfile(companyId, session);
  }

  listOrders(companyId: string, customerId: string, opts: { page?: number; limit?: number }) {
    return this.orderStatus.listOrdersForCustomer(companyId, customerId, opts);
  }

  getOrder(companyId: string, customerId: string, orderId: string) {
    return this.orderStatus.getOrderForCustomer(companyId, customerId, orderId);
  }

  async getPayments(companyId: string, session: EshopCustomerSession) {
    this.assertVerified(session);
    const payments = await this.customersService.getPayments(session.customerId);
    return { payments };
  }

  async getDebts(companyId: string, session: EshopCustomerSession) {
    this.assertVerified(session);
    const icc = await this.companiesService.getInternalCustomerCreditSettings(companyId);
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    if (!icc.enabled || settings.eShopShowDebtsInPortal === false) {
      return { quotas: [], totalDue: 0, credit: null };
    }
    const ar = await this.installmentService.getAccountsReceivable({
      customerId: session.customerId,
      includePaid: false,
      page: 1,
      pageSize: 100,
    });
    const quotas = (ar.rows ?? []).map((inst) => ({
      id: String(inst.id),
      amount: Number(inst.amount ?? 0),
      amountPaid: Number(inst.amountPaid ?? 0),
      dueDate: inst.dueDate,
      documentNumber: inst.saleTransaction?.documentNumber ?? null,
    }));
    const totalDue = quotas.reduce(
      (sum, q) => sum + Math.max(0, q.amount - q.amountPaid),
      0,
    );
    const customer = await this.customerRepo.findOne({
      where: { id: session.customerId, companyId },
    });
    return {
      quotas,
      totalDue,
      credit: customer
        ? {
            limit: Number(customer.creditLimit) || 0,
            used: Number(customer.currentBalance) || 0,
            available:
              Math.max(
                0,
                Number(customer.creditLimit) - Number(customer.currentBalance),
              ),
          }
        : null,
    };
  }

  private assertVerified(session: EshopCustomerSession): void {
    if (!session.emailVerified) {
      throw new ForbiddenException(
        'Verifica tu correo para acceder a pagos y deudas',
      );
    }
  }
}
