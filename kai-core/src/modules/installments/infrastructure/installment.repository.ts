import { Injectable } from '@nestjs/common';
import {
  DataSource,
  Repository,
  Between,
  LessThan,
  In,
  MoreThanOrEqual,
} from 'typeorm';
import {
  Installment,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';

@Injectable()
export class InstallmentRepository extends Repository<Installment> {
  constructor(private dataSource: DataSource) {
    super(Installment, dataSource.createEntityManager());
  }

  /**
   * Obtener cuotas vencidas (para reporte de morosidad)
   */
  async getOverdueInstallments(
    today: Date = new Date(),
  ): Promise<Installment[]> {
    return this.find({
      where: [
        {
          status: InstallmentStatus.OVERDUE,
        },
        {
          status: InstallmentStatus.PENDING,
          dueDate: LessThan(today),
        },
        {
          status: InstallmentStatus.PARTIAL,
          dueDate: LessThan(today),
        },
      ],
    });
  }

  /**
   * Obtener cuotas a vencer próximamente
   */
  async getUpcomingInstallments(
    fromDate: Date,
    toDate: Date,
  ): Promise<Installment[]> {
    return this.find({
      where: {
        status: In([InstallmentStatus.PENDING, InstallmentStatus.PARTIAL]),
        dueDate: Between(fromDate, toDate),
      },
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Obtener todas las cuotas de una transacción
   */
  async getInstallmentsByTransaction(
    saleTransactionId: string,
  ): Promise<Installment[]> {
    return this.find({
      where: { saleTransactionId },
      order: { installmentNumber: 'ASC' },
    });
  }

  /**
   * Calcular resumen de estado de cartera de una transacción
   */
  async getTransactionCarteraStatus(saleTransactionId: string) {
    const installments =
      await this.getInstallmentsByTransaction(saleTransactionId);

    const totalAmount = installments.reduce(
      (sum, i) => sum + parseFloat(i.amount.toString()),
      0,
    );
    const totalPaid = installments.reduce(
      (sum, i) => sum + parseFloat(i.amountPaid.toString()),
      0,
    );
    const paidInstallments = installments.filter(
      (i) => i.status === InstallmentStatus.PAID,
    ).length;
    const pendingInstallments = installments.filter((i) =>
      [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL].includes(i.status),
    ).length;

    return {
      totalInstallments: installments.length,
      totalAmount,
      totalPaid,
      pendingAmount: totalAmount - totalPaid,
      paidInstallments,
      pendingInstallments,
      status:
        totalPaid === 0
          ? 'NOT_PAID'
          : totalPaid === totalAmount
            ? 'PAID'
            : 'PARTIAL',
      installments,
    };
  }

  /**
   * Obtener cuotas por vencer en rango de fechas
   */
  async getCarteraByDueDate(
    fromDate: Date,
    toDate: Date,
  ): Promise<Installment[]> {
    return this.find({
      where: {
        dueDate: Between(fromDate, toDate),
      },
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Obtener resumen de morosidad
   */
  async getOverdueSummary(today: Date = new Date()) {
    const overdue = await this.getOverdueInstallments(today);

    const summary = {
      totalOverdueInstallments: overdue.length,
      totalOverdueAmount: 0,
      byDaysRange: {
        '0-10': { count: 0, amount: 0 },
        '11-30': { count: 0, amount: 0 },
        '31-60': { count: 0, amount: 0 },
        '60+': { count: 0, amount: 0 },
      },
      details: [] as any[],
    };

    for (const inst of overdue) {
      const daysOverdue = inst.getDaysOverdue(today);
      const pending = inst.getPendingAmount();

      summary.totalOverdueAmount += pending;
      summary.details.push({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: inst.amount,
        amountPaid: inst.amountPaid,
        pendingAmount: pending,
        daysOverdue,
        dueDate: inst.dueDate,
      });

      if (daysOverdue <= 10) {
        summary.byDaysRange['0-10'].count++;
        summary.byDaysRange['0-10'].amount += pending;
      } else if (daysOverdue <= 30) {
        summary.byDaysRange['11-30'].count++;
        summary.byDaysRange['11-30'].amount += pending;
      } else if (daysOverdue <= 60) {
        summary.byDaysRange['31-60'].count++;
        summary.byDaysRange['31-60'].amount += pending;
      } else {
        summary.byDaysRange['60+'].count++;
        summary.byDaysRange['60+'].amount += pending;
      }
    }

    return summary;
  }
}
