import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { LaundryReception } from '../domain/laundry-reception.entity';
import { LaundryReceptionGarment } from '../domain/laundry-reception-garment.entity';
import { LaundryReceptionServiceLine } from '../domain/laundry-reception-service-line.entity';
import { LaundryReceptionStatus } from '../domain/laundry-reception-status.enum';
import { LaundryPaymentMode } from '../domain/laundry-payment-mode.enum';
import { LaundryReceptionCodeService } from './laundry-reception-code.service';
import {
  computeServiceLineTotal,
  recalculateLaundryTotals,
} from './utils/recalculate-laundry-totals.util';
import {
  CreateLaundryReceptionDto,
  ListLaundryReceptionsQueryDto,
  RecordLaundryReceptionPaymentDto,
  UpdateLaundryReceptionStatusDto,
} from './dto/laundry-reception.dtos';

export { recalculateLaundryTotals } from './utils/recalculate-laundry-totals.util';

const STATUS_TIMESTAMP_MAP: Partial<
  Record<LaundryReceptionStatus, keyof LaundryReception>
> = {
  [LaundryReceptionStatus.RECEIVED]: 'receivedAt',
  [LaundryReceptionStatus.READY]: 'readyAt',
  [LaundryReceptionStatus.DELIVERED]: 'deliveredAt',
};

@Injectable()
export class LaundryReceptionsService {
  constructor(
    @InjectRepository(LaundryReception)
    private readonly receptionRepo: Repository<LaundryReception>,
    @InjectRepository(LaundryReceptionServiceLine)
    private readonly serviceLineRepo: Repository<LaundryReceptionServiceLine>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly codeService: LaundryReceptionCodeService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateLaundryReceptionDto,
  ): Promise<LaundryReception> {
    if (!dto.garments?.length) {
      throw new BadRequestException('Debe incluir al menos una prenda.');
    }
    for (const garment of dto.garments) {
      if (!garment.serviceLines?.length) {
        throw new BadRequestException(
          'Cada prenda debe tener al menos una línea de servicio.',
        );
      }
    }

    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId, companyId, deletedAt: IsNull() },
      relations: ['person'],
    });
    if (!customer) {
      throw new BadRequestException('Cliente no válido.');
    }

    const variantIds = [
      ...new Set(
        dto.garments.flatMap((g) =>
          g.serviceLines.map((l) => l.productVariantId),
        ),
      ),
    ];
    await this.assertServiceVariants(companyId, variantIds);

    const status = dto.status ?? LaundryReceptionStatus.RECEIVED;
    const paymentMode = dto.paymentMode ?? LaundryPaymentMode.FULL_ON_PICKUP;
    const paidAmount = Number(dto.paidAmount) || 0;
    const depositAmount = Number(dto.depositAmount) || 0;

    type PendingLine = {
      garmentIndex: number;
      productVariantId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      notes: string | null;
      sortOrder: number;
    };

    const pendingLines: PendingLine[] = [];
    const garments = dto.garments.map((gDto, gIdx) => {
      const garment = new LaundryReceptionGarment();
      garment.garmentTypeId = gDto.garmentTypeId;
      garment.quantity = Number(gDto.quantity) || 0;
      garment.attributeValues = (gDto.attributeValues ?? []) as never;
      garment.careInstructions = gDto.careInstructions?.trim() || null;
      garment.customerNotes = gDto.customerNotes?.trim() || null;
      garment.sortOrder = gDto.sortOrder ?? gIdx;

      for (const [lIdx, lDto] of gDto.serviceLines.entries()) {
        const quantity = Number(lDto.quantity) || 0;
        const unitPrice = Number(lDto.unitPrice) || 0;
        pendingLines.push({
          garmentIndex: gIdx,
          productVariantId: lDto.productVariantId,
          quantity,
          unitPrice,
          lineTotal: computeServiceLineTotal(
            garment.quantity * quantity,
            unitPrice,
          ),
          notes: lDto.notes?.trim() || null,
          sortOrder: lDto.sortOrder ?? lIdx,
        });
      }

      return garment;
    });

    const totals = recalculateLaundryTotals(
      pendingLines.map((l) => ({ lineTotal: l.lineTotal })),
      paidAmount,
    );

    const person = customer.person;
    const customerName =
      person?.businessName?.trim() ||
      [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() ||
      'Cliente';
    const customerPhone = person?.phone?.trim() || null;

    let code: string | null = null;
    let receivedAt: Date | null = null;
    if (status === LaundryReceptionStatus.RECEIVED) {
      code = await this.codeService.generateUniqueCode(dto.branchId);
      receivedAt = new Date();
    }

    const receptionId = await this.serviceLineRepo.manager.transaction(
      async (manager) => {
        const receptionRepo = manager.getRepository(LaundryReception);
        const lineRepo = manager.getRepository(LaundryReceptionServiceLine);

        const reception = receptionRepo.create({
          companyId,
          branchId: dto.branchId,
          pointOfSaleId: dto.pointOfSaleId ?? null,
          userId,
          code,
          customerId: dto.customerId,
          customerNameSnapshot: customerName,
          customerPhoneSnapshot: customerPhone,
          status,
          paymentMode,
          depositAmount,
          paidAmount,
          balanceDue: totals.balanceDue,
          servicesTotal: totals.servicesTotal,
          receivedAt,
          promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : null,
          notes: dto.notes?.trim() || null,
          garments,
        });

        const saved = await receptionRepo.save(reception);
        const savedGarments = saved.garments ?? [];
        if (savedGarments.length !== dto.garments.length) {
          throw new BadRequestException(
            'No se pudieron persistir las prendas de la recepción.',
          );
        }

        const lines = pendingLines.map((pending) => {
          const garment = savedGarments[pending.garmentIndex];
          const line = lineRepo.create({
            receptionId: saved.id,
            garmentId: garment.id,
            productVariantId: pending.productVariantId,
            quantity: pending.quantity,
            unitPrice: pending.unitPrice,
            lineTotal: pending.lineTotal,
            notes: pending.notes,
            sortOrder: pending.sortOrder,
          });
          return line;
        });

        await lineRepo.save(lines);
        return saved.id;
      },
    );

    return this.findOne(companyId, receptionId);
  }

  async list(
    companyId: string,
    filters: ListLaundryReceptionsQueryDto,
  ): Promise<{ items: LaundryReception[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(filters.limit || '25', 10) || 25));

    const qb = this.receptionRepo
      .createQueryBuilder('r')
      .where('r.companyId = :companyId', { companyId });

    if (filters.branchId) {
      qb.andWhere('r.branchId = :branchId', { branchId: filters.branchId });
    }
    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.code?.trim()) {
      const code = filters.code.trim();
      // Escaneo CODE128 / código completo: match exacto primero; si no, ILIKE parcial.
      if (/^LV\d+$/i.test(code)) {
        qb.andWhere('UPPER(r.code) = UPPER(:codeExact)', { codeExact: code });
      } else {
        qb.andWhere('r.code ILIKE :code', { code: `%${code}%` });
      }
    }
    if (filters.customerId) {
      qb.andWhere('r.customerId = :customerId', { customerId: filters.customerId });
    }

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(companyId: string, id: string): Promise<LaundryReception> {
    const reception = await this.receptionRepo.findOne({
      where: { id, companyId },
      relations: [
        'garments',
        'garments.serviceLines',
      ],
    });
    if (!reception) {
      throw new NotFoundException('Recepción de lavandería no encontrada.');
    }
    return reception;
  }

  async updateStatus(
    companyId: string,
    id: string,
    dto: UpdateLaundryReceptionStatusDto,
  ): Promise<LaundryReception> {
    const reception = await this.findOne(companyId, id);
    const nextStatus = dto.status;

    if (reception.status === LaundryReceptionStatus.CANCELLED) {
      throw new BadRequestException('La recepción está cancelada.');
    }
    if (reception.status === LaundryReceptionStatus.DELIVERED) {
      throw new BadRequestException('La recepción ya fue entregada.');
    }

    if (
      nextStatus === LaundryReceptionStatus.RECEIVED &&
      !reception.code
    ) {
      reception.code = await this.codeService.generateUniqueCode(reception.branchId);
      reception.receivedAt = reception.receivedAt ?? new Date();
    }

    const tsField = STATUS_TIMESTAMP_MAP[nextStatus];
    if (tsField) {
      const current = reception[tsField];
      if (!current) {
        if (tsField === 'receivedAt') reception.receivedAt = new Date();
        if (tsField === 'readyAt') reception.readyAt = new Date();
        if (tsField === 'deliveredAt') reception.deliveredAt = new Date();
      }
    }

    reception.status = nextStatus;
    return this.receptionRepo.save(reception);
  }

  async recordPayment(
    companyId: string,
    id: string,
    dto: RecordLaundryReceptionPaymentDto,
  ): Promise<LaundryReception> {
    const reception = await this.findOne(companyId, id);
    const increment = Math.max(0, Number(dto.paidAmount) || 0);
    const paidAmount =
      Math.max(0, Number(reception.paidAmount) || 0) + increment;
    reception.paidAmount = paidAmount;
    if (dto.saleTransactionId) {
      reception.saleTransactionId = dto.saleTransactionId;
    }
    if (dto.depositTransactionId) {
      reception.depositTransactionId = dto.depositTransactionId;
    }
    const allLines =
      reception.garments?.flatMap((g) => g.serviceLines ?? []) ?? [];
    const totals = recalculateLaundryTotals(allLines, paidAmount);
    reception.servicesTotal = totals.servicesTotal;
    reception.balanceDue = totals.balanceDue;
    return this.receptionRepo.save(reception);
  }

  async recalculateReceptionTotals(receptionId: string): Promise<LaundryReception> {
    const reception = await this.receptionRepo.findOne({
      where: { id: receptionId },
      relations: ['garments', 'garments.serviceLines'],
    });
    if (!reception) {
      throw new NotFoundException('Recepción de lavandería no encontrada.');
    }

    const allLines =
      reception.garments?.flatMap((g) => g.serviceLines ?? []) ?? [];
    const totals = recalculateLaundryTotals(allLines, reception.paidAmount);
    reception.servicesTotal = totals.servicesTotal;
    reception.balanceDue = totals.balanceDue;
    return this.receptionRepo.save(reception);
  }

  private async assertServiceVariants(
    companyId: string,
    variantIds: string[],
  ): Promise<void> {
    if (!variantIds.length) return;

    const variants = await this.variantRepo.find({
      where: variantIds.map((id) => ({
        id,
        companyId,
        deletedAt: IsNull(),
      })),
      relations: ['product'],
    });

    const found = new Set(variants.map((v) => v.id));
    for (const id of variantIds) {
      if (!found.has(id)) {
        throw new BadRequestException(
          `Variante de producto no válida: ${id}`,
        );
      }
    }

    for (const variant of variants) {
      if (variant.product?.productType !== ProductType.SERVICE) {
        throw new BadRequestException(
          `La variante ${variant.sku} no corresponde a un servicio.`,
        );
      }
    }
  }
}
