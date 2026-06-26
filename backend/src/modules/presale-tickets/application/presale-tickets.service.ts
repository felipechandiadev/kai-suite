import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  PresaleTicket,
  PresaleTicketStatus,
} from '../domain/presale-ticket.entity';
import { PresaleTicketLine } from '../domain/presale-ticket-line.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import {
  readPosKind,
  readAcceptsPresaleTickets,
} from '@modules/points-of-sale/domain/pos-settings.types';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { PresaleTicketCodeService } from './presale-ticket-code.service';
import { CreatePresaleTicketDto } from './dto/presale-ticket.dtos';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { posDisplayStockInSaleUnits } from '@modules/product-variants/application/variant-count-bridge.util';

export type PresaleTicketLineDto = {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
  promotionSnapshot: Record<string, unknown> | null;
  availableStock: number | null;
  availableStockBase: number | null;
  saleUnitSymbol: string | null;
  stockBaseUnitSymbol: string | null;
  stockBaseQtyPerCountSaleUnit: number | null;
  unitAllowDecimals: boolean;
};

export type PresaleTicketDto = {
  id: string;
  code: string;
  status: PresaleTicketStatus;
  presalePointOfSaleId: string;
  branchId: string;
  priceListId: string;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  promotionsSnapshot: Record<string, unknown>[] | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  createdAt: string;
  lines: PresaleTicketLineDto[];
};

@Injectable()
export class PresaleTicketsService {
  constructor(
    @InjectRepository(PresaleTicket)
    private readonly ticketRepository: Repository<PresaleTicket>,
    @InjectRepository(PointOfSale)
    private readonly posRepository: Repository<PointOfSale>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly companiesService: CompaniesService,
    private readonly codeService: PresaleTicketCodeService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreatePresaleTicketDto,
  ): Promise<PresaleTicketDto> {
    const presales = await this.companiesService.getPresaleSettings(companyId);
    if (!presales.enabled) {
      throw new ForbiddenException(
        'El módulo de preventa no está habilitado para esta empresa',
      );
    }

    if (!dto.lines?.length) {
      throw new BadRequestException('El carrito está vacío');
    }

    const pos = await this.posRepository.findOne({
      where: {
        id: dto.presalePointOfSaleId,
        companyId,
        deletedAt: IsNull(),
      },
      relations: ['branch'],
    });
    if (!pos || !pos.isActive) {
      throw new NotFoundException('Punto de preventa no encontrado');
    }
    if (readPosKind(pos.settings) !== 'PRESALE') {
      throw new BadRequestException(
        'Este punto de venta no está configurado como preventa',
      );
    }
    if (!pos.branchId) {
      throw new BadRequestException('El punto de preventa debe tener sucursal');
    }

    const code = await this.codeService.generateUniqueCode(companyId);

    const lines = dto.lines.map((line, index) => {
      const entity = new PresaleTicketLine();
      entity.lineNumber = index + 1;
      entity.productId = line.productId ?? null;
      entity.productVariantId = line.productVariantId ?? null;
      entity.productName = line.productName.trim();
      entity.productSku = line.productSku?.trim() || null;
      entity.variantName = line.variantName?.trim() || null;
      entity.quantity = Number(line.quantity) || 0;
      entity.unitPrice = Number(line.unitPrice) || 0;
      entity.discountAmount = Number(line.discountAmount) || 0;
      entity.taxRate = Number(line.taxRate) || 0;
      entity.taxAmount = Number(line.taxAmount) || 0;
      entity.subtotal = Number(line.subtotal) || 0;
      entity.total = Number(line.total) || 0;
      entity.unitOfMeasure = line.unitOfMeasure?.trim() || null;
      entity.promotionSnapshot = line.promotionSnapshot ?? null;
      return entity;
    });

    const ticket = this.ticketRepository.create({
      companyId,
      code,
      status: PresaleTicketStatus.READY,
      presalePointOfSaleId: pos.id,
      branchId: pos.branchId,
      priceListId: dto.priceListId,
      customerId: dto.customerId?.trim() || null,
      customerName: dto.customerName?.trim() || null,
      customerDocument: dto.customerDocument?.trim() || null,
      subtotal: Number(dto.subtotal) || dto.total,
      taxAmount: Number(dto.taxAmount) || 0,
      discountAmount: Number(dto.discountAmount) || 0,
      total: Number(dto.total) || 0,
      promotionsSnapshot: dto.promotionsSnapshot ?? null,
      createdByUserId: userId,
      lines,
    });

    const saved = await this.ticketRepository.save(ticket);
    return this.toDto(saved, pos.name, pos.branch?.name ?? null);
  }

  async findByCode(
    companyId: string,
    code: string,
    salePointOfSaleId?: string | null,
  ): Promise<PresaleTicketDto | null> {
    const normalized = code?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Código de ticket requerido');
    }

    const ticket = await this.ticketRepository.findOne({
      where: { companyId, code: normalized },
      relations: ['lines'],
    });
    if (!ticket) return null;

    if (ticket.status === PresaleTicketStatus.CANCELLED) {
      throw new BadRequestException('El ticket de preventa fue cancelado');
    }
    if (ticket.status === PresaleTicketStatus.REDEEMED) {
      throw new BadRequestException('El ticket de preventa ya fue cobrado');
    }

    let salePos: PointOfSale | null = null;
    if (salePointOfSaleId?.trim()) {
      salePos = await this.posRepository.findOne({
        where: {
          id: salePointOfSaleId.trim(),
          companyId,
          deletedAt: IsNull(),
        },
        relations: ['branch'],
      });
      if (!salePos) {
        throw new NotFoundException('Punto de venta no encontrado');
      }
      if (readPosKind(salePos.settings) !== 'SALE') {
        throw new BadRequestException(
          'Solo un punto de caja puede cobrar tickets de preventa',
        );
      }
      if (!readAcceptsPresaleTickets(salePos.settings)) {
        throw new BadRequestException(
          'Este punto de venta no acepta tickets de preventa',
        );
      }
      if ((salePos.branchId ?? null) !== ticket.branchId) {
        throw new BadRequestException(
          'El ticket solo puede cobrarse en la misma sucursal donde se emitió',
        );
      }
    }

    const presalePos = await this.posRepository.findOne({
      where: { id: ticket.presalePointOfSaleId },
      relations: ['branch'],
    });

    const dto = await this.toDtoWithStock(
      ticket,
      presalePos?.name ?? null,
      presalePos?.branch?.name ?? null,
      salePos?.storageId ?? null,
      companyId,
    );
    return dto;
  }

  async cancel(
    companyId: string,
    ticketId: string,
    userId: string,
  ): Promise<PresaleTicketDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, companyId },
      relations: ['lines'],
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    if (ticket.status !== PresaleTicketStatus.READY) {
      throw new BadRequestException(
        'Solo se pueden cancelar tickets pendientes',
      );
    }
    ticket.status = PresaleTicketStatus.CANCELLED;
    ticket.cancelledAt = new Date();
    ticket.cancelledByUserId = userId;
    await this.ticketRepository.save(ticket);

    const presalePos = await this.posRepository.findOne({
      where: { id: ticket.presalePointOfSaleId },
      relations: ['branch'],
    });
    return this.toDto(
      ticket,
      presalePos?.name ?? null,
      presalePos?.branch?.name ?? null,
    );
  }

  async redeemAfterSale(params: {
    companyId: string;
    ticketId: string;
    saleTransactionId: string;
    salePointOfSaleId: string;
    manager?: import('typeorm').EntityManager;
  }): Promise<void> {
    const repo = params.manager
      ? params.manager.getRepository(PresaleTicket)
      : this.ticketRepository;

    const ticket = await repo.findOne({
      where: { id: params.ticketId, companyId: params.companyId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket de preventa no encontrado');
    }
    if (ticket.status !== PresaleTicketStatus.READY) {
      throw new BadRequestException(
        'El ticket de preventa ya no está disponible para cobro',
      );
    }

    ticket.status = PresaleTicketStatus.REDEEMED;
    ticket.redeemedAt = new Date();
    ticket.redeemedTransactionId = params.saleTransactionId;
    ticket.redeemedPointOfSaleId = params.salePointOfSaleId;
    await repo.save(ticket);
  }

  private async toDtoWithStock(
    ticket: PresaleTicket,
    pointOfSaleName: string | null,
    branchName: string | null,
    storageId: string | null,
    companyId: string,
  ): Promise<PresaleTicketDto> {
    const base = this.toDto(ticket, pointOfSaleName, branchName);
    if (!storageId) return base;

    const variantIds = (ticket.lines ?? [])
      .map((l) => l.productVariantId)
      .filter((id): id is string => !!id);

    const variantMap = new Map<string, ProductVariant>();
    const stockMap = new Map<string, number>();
    let unitsById: Map<string, Unit> | undefined;

    if (variantIds.length > 0) {
      const variants = await this.dataSource.getRepository(ProductVariant).find({
        where: variantIds.map((id) => ({ id, deletedAt: IsNull() })),
        relations: ['saleUnit', 'stockBaseUnit'],
      });
      for (const v of variants) variantMap.set(v.id, v);

      const unitRows = await this.dataSource.getRepository(Unit).find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));

      const stockLevels = await this.dataSource
        .getRepository(StockLevel)
        .createQueryBuilder('sl')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('sl.storageId = :storageId', { storageId })
        .select('sl.productVariantId', 'variantId')
        .addSelect('sl.availableStock', 'availableStock')
        .getRawMany<{ variantId: string; availableStock: string }>();
      for (const row of stockLevels) {
        stockMap.set(row.variantId, Number(row.availableStock ?? 0));
      }
    }

    base.lines = (ticket.lines ?? [])
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map((line) => {
        const dtoLine = this.mapLine(line);
        const variant = line.productVariantId
          ? variantMap.get(line.productVariantId)
          : undefined;
        const track = variant?.trackInventory ?? true;
        const stockBase = line.productVariantId
          ? (stockMap.get(line.productVariantId) ?? 0)
          : 0;
        const display = posDisplayStockInSaleUnits({
          physicalStockInBase: stockBase,
          stockBaseUnitId: variant?.stockBaseUnitId,
          saleUnitId: variant?.saleUnitId,
          stockBaseDimension: (variant as { stockBaseUnit?: { dimension?: unknown } })
            ?.stockBaseUnit?.dimension as never,
          saleDimension: (variant as { saleUnit?: { dimension?: unknown } })?.saleUnit
            ?.dimension as never,
          stockBaseQtyPerCountSaleUnit: (variant as { stockBaseQtyPerCountSaleUnit?: unknown })
            ?.stockBaseQtyPerCountSaleUnit,
          unitsById,
        });
        return {
          ...dtoLine,
          availableStock: track ? display : null,
          availableStockBase: track ? stockBase : null,
          saleUnitSymbol: (variant as { saleUnit?: { symbol?: string } })?.saleUnit
            ?.symbol ?? null,
          stockBaseUnitSymbol: (variant as { stockBaseUnit?: { symbol?: string } })
            ?.stockBaseUnit?.symbol ?? null,
          stockBaseQtyPerCountSaleUnit: (() => {
            const raw = (variant as { stockBaseQtyPerCountSaleUnit?: unknown })
              ?.stockBaseQtyPerCountSaleUnit;
            const n = Number(raw);
            return Number.isFinite(n) && n > 0 ? n : null;
          })(),
          unitAllowDecimals:
            (variant as { saleUnit?: { allowDecimals?: boolean } })?.saleUnit
              ?.allowDecimals === true,
        };
      });

    return base;
  }

  private toDto(
    ticket: PresaleTicket,
    pointOfSaleName: string | null,
    branchName: string | null,
  ): PresaleTicketDto {
    return {
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      presalePointOfSaleId: ticket.presalePointOfSaleId,
      branchId: ticket.branchId,
      priceListId: ticket.priceListId,
      customerId: ticket.customerId ?? null,
      customerName: ticket.customerName ?? null,
      customerDocument: ticket.customerDocument ?? null,
      subtotal: Number(ticket.subtotal) || 0,
      taxAmount: Number(ticket.taxAmount) || 0,
      discountAmount: Number(ticket.discountAmount) || 0,
      total: Number(ticket.total) || 0,
      promotionsSnapshot: (ticket.promotionsSnapshot as Record<string, unknown>[]) ?? null,
      branchName,
      pointOfSaleName,
      createdAt: ticket.createdAt?.toISOString?.() ?? new Date().toISOString(),
      lines: (ticket.lines ?? [])
        .sort((a, b) => a.lineNumber - b.lineNumber)
        .map((line) => this.mapLine(line)),
    };
  }

  private mapLine(line: PresaleTicketLine): PresaleTicketLineDto {
    return {
      id: line.id,
      lineNumber: line.lineNumber,
      productId: line.productId ?? null,
      productVariantId: line.productVariantId ?? null,
      productName: line.productName,
      productSku: line.productSku ?? null,
      variantName: line.variantName ?? null,
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      discountAmount: Number(line.discountAmount) || 0,
      taxRate: Number(line.taxRate) || 0,
      taxAmount: Number(line.taxAmount) || 0,
      subtotal: Number(line.subtotal) || 0,
      total: Number(line.total) || 0,
      unitOfMeasure: line.unitOfMeasure ?? null,
      promotionSnapshot: line.promotionSnapshot ?? null,
      availableStock: null,
      availableStockBase: null,
      saleUnitSymbol: null,
      stockBaseUnitSymbol: null,
      stockBaseQtyPerCountSaleUnit: null,
      unitAllowDecimals: false,
    };
  }
}
