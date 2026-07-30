import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Installment,
  InstallmentStatus,
} from '../../domain/installment.entity';
import { InstallmentRepositoryPort } from '../../application/ports/installment.repository.port';

/**
 * Installment Repository Implementation
 * Implementa el puerto de repositorio usando TypeORM
 */
@Injectable()
export class InstallmentRepository implements InstallmentRepositoryPort {
  constructor(
    @InjectRepository(Installment)
    private readonly installmentRepo: Repository<Installment>,
  ) {}

  async save(installment: Installment): Promise<Installment> {
    return await this.installmentRepo.save(installment);
  }

  async findById(id: string): Promise<Installment | null> {
    return await this.installmentRepo.findOne({
      where: { id },
      relations: ['transaction', 'paymentTransaction'],
    });
  }

  async findByTransactionId(transactionId: string): Promise<Installment[]> {
    return await this.installmentRepo.find({
      where: { transactionId },
      relations: ['transaction', 'paymentTransaction'],
      order: { installmentNumber: 'ASC' },
    });
  }

  async findPendingByTransactionId(
    transactionId: string,
  ): Promise<Installment[]> {
    return await this.installmentRepo.find({
      where: {
        transactionId,
        status: InstallmentStatus.PENDING,
      },
      relations: ['transaction', 'paymentTransaction'],
      order: { dueDate: 'ASC' },
    });
  }

  async findOverdue(): Promise<Installment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.installmentRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.transaction', 't')
      .leftJoinAndSelect('i.paymentTransaction', 'pt')
      .where('i.status = :status', { status: InstallmentStatus.PENDING })
      .andWhere('i.dueDate < :today', { today })
      .orderBy('i.dueDate', 'ASC')
      .getMany();
  }

  async updateStatus(
    id: string,
    status: InstallmentStatus,
    paymentTransactionId?: string,
  ): Promise<Installment> {
    const updateData: any = { status };

    if (paymentTransactionId) {
      updateData.paymentTransactionId = paymentTransactionId;
      if (status === InstallmentStatus.PAID) {
        updateData.paidAt = new Date();
      }
    }

    await this.installmentRepo.update(id, updateData);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Installment ${id} not found after update`);
    }

    return updated;
  }

  async addPayment(
    id: string,
    amount: number,
    paymentTransactionId: string,
  ): Promise<Installment> {
    const installment = await this.findById(id);
    if (!installment) {
      throw new Error(`Installment ${id} not found`);
    }

    installment.addPayment(amount, paymentTransactionId);
    return await this.save(installment);
  }

  async delete(id: string): Promise<void> {
    await this.installmentRepo.delete(id);
  }
}
