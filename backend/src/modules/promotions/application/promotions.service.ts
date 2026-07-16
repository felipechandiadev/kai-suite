import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Promotion } from '../domain/promotion.entity';
import { PromotionScopeBranch } from '../domain/promotion-scope-branch.entity';
import { PromotionScopePos } from '../domain/promotion-scope-pos.entity';
import { PromotionScopeProduct } from '../domain/promotion-scope-product.entity';
import { PromotionScopeVariant } from '../domain/promotion-scope-variant.entity';
import { PromotionScopeCategory } from '../domain/promotion-scope-category.entity';
import { PromotionScopeCustomer } from '../domain/promotion-scope-customer.entity';
import { PromotionScopePaymentMethod } from '../domain/promotion-scope-payment-method.entity';
import {
  PromotionActivation,
  PromotionType,
} from '../domain/promotion.enums';
import {
  CreatePromotionDto,
  ListPromotionsQueryDto,
  PromotionScopesDto,
  UpdatePromotionDto,
} from './dto/promotion.dtos';
import { EffectivePromotion } from './discount-engine.types';

export interface PromotionRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  value: number;
  maxValue: number | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  activation: PromotionActivation;
  redemptionCode: string | null;
  stackable: boolean;
  priority: number;
  usesCount: number;
  maxUsesTotal: number | null;
  effectiveStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXPIRING_SOON';
  scopeSummary: {
    branches: number;
    pointsOfSale: number;
    products: number;
    variants: number;
    categories: number;
    customers: number;
    paymentMethods: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PromotionDetail extends PromotionRow {
  minSubtotal: number | null;
  minQuantity: number | null;
  daysOfWeek: number[] | null;
  hourFrom: string | null;
  hourTo: string | null;
  maxUsesPerCustomer: number | null;
  authorization: string;
  authorizationLimitPct: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  getDiscountPercent: number | null;
  preloadOnPaymentScreen: boolean;
  displayOrder: number;
  accountingTag: string | null;
  scopes: {
    branches: { branchId: string; mode: string }[];
    pointsOfSale: { pointOfSaleId: string; mode: string }[];
    products: { productId: string; mode: string }[];
    variants: { productVariantId: string; mode: string }[];
    categories: { categoryId: string; mode: string }[];
    customers: { customerId: string; mode: string }[];
    paymentMethods: { companyPaymentMethodId: string; mode: string }[];
  };
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
    @InjectRepository(PromotionScopeBranch)
    private readonly scopeBranchRepo: Repository<PromotionScopeBranch>,
    @InjectRepository(PromotionScopePos)
    private readonly scopePosRepo: Repository<PromotionScopePos>,
    @InjectRepository(PromotionScopeProduct)
    private readonly scopeProductRepo: Repository<PromotionScopeProduct>,
    @InjectRepository(PromotionScopeVariant)
    private readonly scopeVariantRepo: Repository<PromotionScopeVariant>,
    @InjectRepository(PromotionScopeCategory)
    private readonly scopeCategoryRepo: Repository<PromotionScopeCategory>,
    @InjectRepository(PromotionScopeCustomer)
    private readonly scopeCustomerRepo: Repository<PromotionScopeCustomer>,
    @InjectRepository(PromotionScopePaymentMethod)
    private readonly scopePMRepo: Repository<PromotionScopePaymentMethod>,
  ) {}

  // ============================================================
  // LIST / GET
  // ============================================================

  async list(
    companyId: string,
    filters: ListPromotionsQueryDto,
  ): Promise<{ items: PromotionRow[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(filters.page || '1', 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(filters.limit || '25', 10) || 25));

    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.deletedAt IS NULL');

    if (filters.search) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('p.code ILIKE :s', { s: `%${filters.search}%` }).orWhere(
            'p.name ILIKE :s',
            { s: `%${filters.search}%` },
          );
        }),
      );
    }
    if (filters.isActive === 'true' || filters.isActive === 'false') {
      qb.andWhere('p.isActive = :ia', { ia: filters.isActive === 'true' });
    }
    if (filters.type) {
      qb.andWhere('p.type = :type', { type: filters.type });
    }
    if (filters.activation) {
      qb.andWhere('p.activation = :act', { act: filters.activation });
    }

    const sortColumnByField: Record<string, string> = {
      code: 'p.code',
      name: 'p.name',
      type: 'p.type',
      value: 'p.value',
      validFrom: 'p.validFrom',
      validUntil: 'p.validUntil',
      activation: 'p.activation',
      usesCount: 'p.usesCount',
      priority: 'p.priority',
      createdAt: 'p.createdAt',
    };
    const sortColumn = filters.sortField
      ? sortColumnByField[filters.sortField]
      : undefined;
    const sortDirection =
      (filters.sort || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    if (sortColumn) {
      qb.orderBy(sortColumn, sortDirection);
    } else {
      qb.orderBy('p.priority', 'DESC').addOrderBy('p.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const items: PromotionRow[] = [];
    for (const p of rows) {
      items.push(await this.toRow(p));
    }
    return { items, total, page, limit };
  }

  async getById(companyId: string, id: string): Promise<PromotionDetail> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    return this.toDetail(p);
  }

  // ============================================================
  // CREATE / UPDATE / DELETE
  // ============================================================

  async create(
    companyId: string,
    userId: string,
    dto: CreatePromotionDto,
  ): Promise<PromotionDetail> {
    this.validateDto(dto, false);

    return this.dataSource.transaction(async (manager) => {
      // Resolver `code`: si el cliente lo envía, validamos unicidad.
      // Si no lo envía (camino estándar de la UI), lo autogeneramos a
      // partir del `name` con sufijo aleatorio, reintentando hasta
      // encontrar uno libre.
      const explicitCode = (dto.code ?? '').trim();
      let resolvedCode: string;
      if (explicitCode) {
        const codeTaken = await manager
          .getRepository(Promotion)
          .createQueryBuilder('p')
          .where('p.companyId = :c AND p.code = :code AND p.deletedAt IS NULL', {
            c: companyId,
            code: explicitCode,
          })
          .getCount();
        if (codeTaken > 0) {
          throw new BadRequestException(
            `El código '${explicitCode}' ya está en uso.`,
          );
        }
        resolvedCode = explicitCode;
      } else {
        resolvedCode = await this.generateUniqueCode(manager, companyId, dto.name);
      }

      if (dto.activation === PromotionActivation.CODE_ENTRY && dto.redemptionCode) {
        const rcTaken = await manager
          .getRepository(Promotion)
          .createQueryBuilder('p')
          .where(
            'p.companyId = :c AND p.redemptionCode = :rc AND p.activation = :act AND p.deletedAt IS NULL',
            { c: companyId, rc: dto.redemptionCode, act: PromotionActivation.CODE_ENTRY },
          )
          .getCount();
        if (rcTaken > 0) {
          throw new BadRequestException(
            `El cupón '${dto.redemptionCode}' ya está en uso.`,
          );
        }
      }

      const p = manager.getRepository(Promotion).create({
        companyId,
        code: resolvedCode,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type,
        value: dto.value,
        maxValue: dto.maxValue ?? null,
        isActive: dto.isActive ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        activation: dto.activation,
        redemptionCode: dto.redemptionCode ?? null,
        stackable: dto.stackable ?? true,
        priority: dto.priority ?? 0,
        minSubtotal: dto.minSubtotal ?? null,
        minQuantity: dto.minQuantity ?? null,
        daysOfWeek: dto.daysOfWeek ?? null,
        hourFrom: dto.hourFrom ?? null,
        hourTo: dto.hourTo ?? null,
        maxUsesTotal: dto.maxUsesTotal ?? null,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? null,
        authorization: dto.authorization ?? (undefined as any),
        authorizationLimitPct: dto.authorizationLimitPct ?? null,
        buyQuantity: dto.buyQuantity ?? null,
        getQuantity: dto.getQuantity ?? null,
        getDiscountPercent: dto.getDiscountPercent ?? null,
        preloadOnPaymentScreen: dto.preloadOnPaymentScreen ?? false,
        displayOrder: dto.displayOrder ?? 0,
        accountingTag: dto.accountingTag ?? null,
        createdBy: userId,
        updatedBy: userId,
      });
      const saved = await manager.getRepository(Promotion).save(p);

      await this.replaceScopes(manager, saved.id, dto.scopes ?? {});

      return this.toDetail(
        (await manager.getRepository(Promotion).findOne({ where: { id: saved.id } }))!,
        manager,
      );
    });
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionDetail> {
    this.validateDto(dto, true);

    return this.dataSource.transaction(async (manager) => {
      const p = await manager
        .getRepository(Promotion)
        .findOne({ where: { id, companyId } });
      if (!p) throw new NotFoundException('Promoción no encontrada');

      if (dto.code && dto.code !== p.code) {
        const codeTaken = await manager
          .getRepository(Promotion)
          .createQueryBuilder('p2')
          .where(
            'p2.companyId = :c AND p2.code = :code AND p2.id <> :id AND p2.deletedAt IS NULL',
            { c: companyId, code: dto.code, id },
          )
          .getCount();
        if (codeTaken > 0) {
          throw new BadRequestException(`El código '${dto.code}' ya está en uso.`);
        }
        p.code = dto.code;
      }

      if (dto.name !== undefined) p.name = dto.name;
      if (dto.description !== undefined) p.description = dto.description;
      if (dto.type !== undefined) p.type = dto.type;
      if (dto.value !== undefined) p.value = dto.value;
      if (dto.maxValue !== undefined) p.maxValue = dto.maxValue;
      if (dto.isActive !== undefined) p.isActive = dto.isActive;
      if (dto.validFrom !== undefined)
        p.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
      if (dto.validUntil !== undefined)
        p.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      if (dto.activation !== undefined) p.activation = dto.activation;
      if (dto.redemptionCode !== undefined) p.redemptionCode = dto.redemptionCode;
      if (dto.stackable !== undefined) p.stackable = dto.stackable;
      if (dto.priority !== undefined) p.priority = dto.priority;
      if (dto.minSubtotal !== undefined) p.minSubtotal = dto.minSubtotal;
      if (dto.minQuantity !== undefined) p.minQuantity = dto.minQuantity;
      if (dto.daysOfWeek !== undefined) p.daysOfWeek = dto.daysOfWeek;
      if (dto.hourFrom !== undefined) p.hourFrom = dto.hourFrom;
      if (dto.hourTo !== undefined) p.hourTo = dto.hourTo;
      if (dto.maxUsesTotal !== undefined) p.maxUsesTotal = dto.maxUsesTotal;
      if (dto.maxUsesPerCustomer !== undefined)
        p.maxUsesPerCustomer = dto.maxUsesPerCustomer;
      if (dto.authorization !== undefined) p.authorization = dto.authorization;
      if (dto.authorizationLimitPct !== undefined)
        p.authorizationLimitPct = dto.authorizationLimitPct;
      if (dto.buyQuantity !== undefined) p.buyQuantity = dto.buyQuantity;
      if (dto.getQuantity !== undefined) p.getQuantity = dto.getQuantity;
      if (dto.getDiscountPercent !== undefined)
        p.getDiscountPercent = dto.getDiscountPercent;
      if (dto.preloadOnPaymentScreen !== undefined)
        p.preloadOnPaymentScreen = dto.preloadOnPaymentScreen;
      if (dto.displayOrder !== undefined) p.displayOrder = dto.displayOrder;
      if (dto.accountingTag !== undefined) p.accountingTag = dto.accountingTag;
      p.updatedBy = userId;

      await manager.getRepository(Promotion).save(p);

      if (dto.scopes) {
        await this.replaceScopes(manager, p.id, dto.scopes);
      }

      return this.toDetail(p, manager);
    });
  }

  async setActive(
    companyId: string,
    userId: string,
    id: string,
    isActive: boolean,
  ): Promise<PromotionDetail> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    p.isActive = isActive;
    p.updatedBy = userId;
    await this.repo.save(p);
    return this.toDetail(p);
  }

  async softDelete(companyId: string, id: string): Promise<{ id: string }> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Promoción no encontrada');
    await this.repo.softRemove(p);
    return { id };
  }

  // ============================================================
  // QUERIES PARA EL MOTOR (PR 4 las consumirá)
  // ============================================================

  /**
   * Devuelve las promociones "efectivas" (con scopes ya unidos) para una
   * sucursal + POS dados, filtrando inactivas y vencidas. El motor en
   * cliente las recibe en este formato.
   */
  async findEffective(
    companyId: string,
    branchId: string,
    pointOfSaleId: string,
    includeCodeEntry = false,
  ): Promise<EffectivePromotion[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.isActive = true');

    if (!includeCodeEntry) {
      qb.andWhere('p.activation IN (:...acts)', {
        acts: [PromotionActivation.AUTO, PromotionActivation.MANUAL],
      });
    }

    qb.andWhere(
      new Brackets((b) => {
        b.where('p.validUntil IS NULL').orWhere('p.validUntil >= now()');
      }),
    );

    const rows = await qb.orderBy('p.priority', 'DESC').getMany();
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [branches, poss, products, variants, categories, customers, payments] =
      await Promise.all([
        this.scopeBranchRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopePosRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopeProductRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopeVariantRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopeCategoryRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopeCustomerRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
        this.scopePMRepo.find({ where: ids.map((id) => ({ promotionId: id })) }),
      ]);

    const byId = new Map<string, EffectivePromotion>();
    for (const p of rows) {
      byId.set(p.id, {
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        value: Number(p.value),
        maxValue: p.maxValue != null ? Number(p.maxValue) : null,
        validFrom: p.validFrom ? p.validFrom.toISOString() : null,
        validUntil: p.validUntil ? p.validUntil.toISOString() : null,
        activation: p.activation,
        redemptionCode: p.redemptionCode ?? null,
        stackable: p.stackable,
        priority: p.priority,
        minSubtotal: p.minSubtotal != null ? Number(p.minSubtotal) : null,
        minQuantity: p.minQuantity ?? null,
        daysOfWeek: p.daysOfWeek ?? null,
        hourFrom: p.hourFrom ?? null,
        hourTo: p.hourTo ?? null,
        maxUsesTotal: p.maxUsesTotal ?? null,
        maxUsesPerCustomer: p.maxUsesPerCustomer ?? null,
        usesCount: p.usesCount,
        authorization: p.authorization,
        authorizationLimitPct:
          p.authorizationLimitPct != null ? Number(p.authorizationLimitPct) : null,
        buyQuantity: p.buyQuantity ?? null,
        getQuantity: p.getQuantity ?? null,
        getDiscountPercent:
          p.getDiscountPercent != null ? Number(p.getDiscountPercent) : null,
        accountingTag: p.accountingTag ?? null,
        scopes: {
          branches: [],
          pointsOfSale: [],
          products: [],
          variants: [],
          categories: [],
          customers: [],
          paymentMethods: [],
        },
      });
    }

    for (const s of branches)
      byId.get(s.promotionId)?.scopes.branches.push({ branchId: s.branchId, mode: s.mode });
    for (const s of poss)
      byId
        .get(s.promotionId)
        ?.scopes.pointsOfSale.push({ pointOfSaleId: s.pointOfSaleId, mode: s.mode });
    for (const s of products)
      byId.get(s.promotionId)?.scopes.products.push({ productId: s.productId, mode: s.mode });
    for (const s of variants)
      byId
        .get(s.promotionId)
        ?.scopes.variants.push({ variantId: s.productVariantId, mode: s.mode });
    for (const s of categories)
      byId.get(s.promotionId)?.scopes.categories.push({ categoryId: s.categoryId, mode: s.mode });
    for (const s of customers)
      byId.get(s.promotionId)?.scopes.customers.push({ customerId: s.customerId, mode: s.mode });
    for (const s of payments)
      byId
        .get(s.promotionId)
        ?.scopes.paymentMethods.push({
          companyPaymentMethodId: s.companyPaymentMethodId,
          mode: s.mode,
        });

    // Filtro final por branch + POS scope (si la promoción declara
    // INCLUDE de branch y no incluye el actual, fuera; ídem POS).
    const all = Array.from(byId.values());
    return all.filter((p) => {
      const branchScopes = p.scopes.branches;
      if (branchScopes.length > 0) {
        const inc = branchScopes.filter((s) => s.mode === 'INCLUDE');
        const exc = branchScopes.filter((s) => s.mode === 'EXCLUDE');
        if (exc.some((s) => s.branchId === branchId)) return false;
        if (inc.length > 0 && !inc.some((s) => s.branchId === branchId)) return false;
      }
      const posScopes = p.scopes.pointsOfSale;
      if (posScopes.length > 0) {
        const inc = posScopes.filter((s) => s.mode === 'INCLUDE');
        const exc = posScopes.filter((s) => s.mode === 'EXCLUDE');
        if (exc.some((s) => s.pointOfSaleId === pointOfSaleId)) return false;
        if (inc.length > 0 && !inc.some((s) => s.pointOfSaleId === pointOfSaleId))
          return false;
      }
      return true;
    });
  }

  async findEffectiveByRedemptionCode(
    companyId: string,
    branchId: string,
    pointOfSaleId: string,
    code: string,
  ): Promise<EffectivePromotion | null> {
    const all = await this.findEffective(companyId, branchId, pointOfSaleId, true);
    const found = all.find(
      (p) =>
        p.activation === PromotionActivation.CODE_ENTRY &&
        (p.redemptionCode ?? '').toLowerCase() === code.trim().toLowerCase(),
    );
    return found ?? null;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private validateDto(dto: UpdatePromotionDto, partial: boolean): void {
    if (!partial) {
      // `code` ya no es requerido: si no llega, se autogenera en `create()`.
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException('`name` es requerido');
      }
      if (!dto.type) throw new BadRequestException('`type` es requerido');
      if (dto.activation === undefined)
        throw new BadRequestException('`activation` es requerido');
    }
    if (dto.validFrom && dto.validUntil) {
      if (new Date(dto.validFrom).getTime() >= new Date(dto.validUntil).getTime()) {
        throw new BadRequestException('`validFrom` debe ser anterior a `validUntil`');
      }
    }
    if (dto.activation === PromotionActivation.CODE_ENTRY && partial === false) {
      if (!dto.redemptionCode || !dto.redemptionCode.trim()) {
        throw new BadRequestException(
          '`redemptionCode` es requerido para activación CODE_ENTRY',
        );
      }
    }
    if (dto.type) {
      const isPercent =
        dto.type === PromotionType.PERCENT_ON_LINE ||
        dto.type === PromotionType.PERCENT_ON_ORDER;
      if (isPercent && dto.value != null && (dto.value < 0 || dto.value > 100)) {
        throw new BadRequestException(
          'Para porcentajes, `value` debe estar entre 0 y 100',
        );
      }
      if (!isPercent && dto.value != null && dto.value < 0) {
        throw new BadRequestException('`value` no puede ser negativo');
      }
      if (dto.type === PromotionType.BUY_X_GET_Y && partial === false) {
        if (!dto.buyQuantity || dto.buyQuantity < 1)
          throw new BadRequestException('`buyQuantity` requerido para BUY_X_GET_Y');
        if (!dto.getQuantity || dto.getQuantity < 1)
          throw new BadRequestException('`getQuantity` requerido para BUY_X_GET_Y');
      }
    }
  }

  /**
   * Autogenera un `code` único por empresa. Toma un slug del `name`
   * (mayúsculas, alfanumérico, máx. 16 chars) y le concatena un sufijo
   * aleatorio de 6 caracteres. Reintenta hasta encontrar uno libre.
   *
   * Ejemplos:
   *   name="Black Friday 30%"  → "BLACKFRIDAY30-7F2K9X"
   *   name=""                  → "PROMO-7F2K9X"
   */
  private async generateUniqueCode(
    manager: import('typeorm').EntityManager,
    companyId: string,
    name: string | undefined,
  ): Promise<string> {
    const slugBase =
      (name ?? '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 16) || 'PROMO';

    const randSuffix = (): string => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let out = '';
      for (let i = 0; i < 6; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      return out;
    };

    const repo = manager.getRepository(Promotion);
    for (let attempt = 0; attempt < 25; attempt++) {
      const candidate = `${slugBase}${randSuffix()}`;
      const taken = await repo
        .createQueryBuilder('p')
        .where('p.companyId = :c AND p.code = :code AND p.deletedAt IS NULL', {
          c: companyId,
          code: candidate,
        })
        .getCount();
      if (taken === 0) return candidate;
    }
    // Fallback prácticamente inalcanzable: 25 colisiones consecutivas
    // sobre un espacio de 32^6 = ~1.07B combinaciones.
    throw new BadRequestException(
      'No fue posible generar un código único para la promoción.',
    );
  }

  private async replaceScopes(
    manager: import('typeorm').EntityManager,
    promotionId: string,
    scopes: PromotionScopesDto,
  ): Promise<void> {
    await manager
      .getRepository(PromotionScopeBranch)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopePos)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopeProduct)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopeVariant)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopeCategory)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopeCustomer)
      .delete({ promotionId });
    await manager
      .getRepository(PromotionScopePaymentMethod)
      .delete({ promotionId });

    if (scopes.branches?.length) {
      await manager.getRepository(PromotionScopeBranch).insert(
        scopes.branches.map((s) => ({
          promotionId,
          branchId: s.branchId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.pointsOfSale?.length) {
      await manager.getRepository(PromotionScopePos).insert(
        scopes.pointsOfSale.map((s) => ({
          promotionId,
          pointOfSaleId: s.pointOfSaleId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.products?.length) {
      await manager.getRepository(PromotionScopeProduct).insert(
        scopes.products.map((s) => ({
          promotionId,
          productId: s.productId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.variants?.length) {
      await manager.getRepository(PromotionScopeVariant).insert(
        scopes.variants.map((s) => ({
          promotionId,
          productVariantId: s.productVariantId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.categories?.length) {
      await manager.getRepository(PromotionScopeCategory).insert(
        scopes.categories.map((s) => ({
          promotionId,
          categoryId: s.categoryId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.customers?.length) {
      await manager.getRepository(PromotionScopeCustomer).insert(
        scopes.customers.map((s) => ({
          promotionId,
          customerId: s.customerId,
          mode: s.mode,
        })),
      );
    }
    if (scopes.paymentMethods?.length) {
      await manager.getRepository(PromotionScopePaymentMethod).insert(
        scopes.paymentMethods.map((s) => ({
          promotionId,
          companyPaymentMethodId: s.companyPaymentMethodId,
          mode: s.mode,
        })),
      );
    }
  }

  private async toRow(p: Promotion): Promise<PromotionRow> {
    const counts = await this.dataSource.query<{ table: string; cnt: string }[]>(
      `SELECT 'branches' AS table, COUNT(*) AS cnt FROM promotion_scope_branches WHERE promotion_id = $1
       UNION ALL SELECT 'pos', COUNT(*) FROM promotion_scope_pos WHERE promotion_id = $1
       UNION ALL SELECT 'products', COUNT(*) FROM promotion_scope_products WHERE promotion_id = $1
       UNION ALL SELECT 'variants', COUNT(*) FROM promotion_scope_variants WHERE promotion_id = $1
       UNION ALL SELECT 'categories', COUNT(*) FROM promotion_scope_categories WHERE promotion_id = $1
       UNION ALL SELECT 'customers', COUNT(*) FROM promotion_scope_customers WHERE promotion_id = $1
       UNION ALL SELECT 'payment_methods', COUNT(*) FROM promotion_scope_payment_methods WHERE promotion_id = $1`,
      [p.id],
    );
    const scopeSummary = {
      branches: 0,
      pointsOfSale: 0,
      products: 0,
      variants: 0,
      categories: 0,
      customers: 0,
      paymentMethods: 0,
    };
    for (const r of counts ?? []) {
      const cnt = Number(r.cnt) || 0;
      if (r.table === 'branches') scopeSummary.branches = cnt;
      else if (r.table === 'pos') scopeSummary.pointsOfSale = cnt;
      else if (r.table === 'products') scopeSummary.products = cnt;
      else if (r.table === 'variants') scopeSummary.variants = cnt;
      else if (r.table === 'categories') scopeSummary.categories = cnt;
      else if (r.table === 'customers') scopeSummary.customers = cnt;
      else if (r.table === 'payment_methods') scopeSummary.paymentMethods = cnt;
    }

    return {
      id: p.id,
      companyId: p.companyId,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      type: p.type,
      value: Number(p.value),
      maxValue: p.maxValue != null ? Number(p.maxValue) : null,
      isActive: p.isActive,
      validFrom: p.validFrom ? p.validFrom.toISOString() : null,
      validUntil: p.validUntil ? p.validUntil.toISOString() : null,
      activation: p.activation,
      redemptionCode: p.redemptionCode ?? null,
      stackable: p.stackable,
      priority: p.priority,
      usesCount: p.usesCount,
      maxUsesTotal: p.maxUsesTotal ?? null,
      effectiveStatus: this.computeEffectiveStatus(p),
      scopeSummary,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private async toDetail(
    p: Promotion,
    manager?: import('typeorm').EntityManager,
  ): Promise<PromotionDetail> {
    const row = await this.toRow(p);
    const repo = manager
      ? {
          b: manager.getRepository(PromotionScopeBranch),
          ps: manager.getRepository(PromotionScopePos),
          pr: manager.getRepository(PromotionScopeProduct),
          v: manager.getRepository(PromotionScopeVariant),
          c: manager.getRepository(PromotionScopeCategory),
          cu: manager.getRepository(PromotionScopeCustomer),
          pm: manager.getRepository(PromotionScopePaymentMethod),
        }
      : {
          b: this.scopeBranchRepo,
          ps: this.scopePosRepo,
          pr: this.scopeProductRepo,
          v: this.scopeVariantRepo,
          c: this.scopeCategoryRepo,
          cu: this.scopeCustomerRepo,
          pm: this.scopePMRepo,
        };

    const [branches, poss, products, variants, categories, customers, payments] =
      await Promise.all([
        repo.b.find({ where: { promotionId: p.id } }),
        repo.ps.find({ where: { promotionId: p.id } }),
        repo.pr.find({ where: { promotionId: p.id } }),
        repo.v.find({ where: { promotionId: p.id } }),
        repo.c.find({ where: { promotionId: p.id } }),
        repo.cu.find({ where: { promotionId: p.id } }),
        repo.pm.find({ where: { promotionId: p.id } }),
      ]);

    return {
      ...row,
      minSubtotal: p.minSubtotal != null ? Number(p.minSubtotal) : null,
      minQuantity: p.minQuantity ?? null,
      daysOfWeek: p.daysOfWeek ?? null,
      hourFrom: p.hourFrom ?? null,
      hourTo: p.hourTo ?? null,
      maxUsesPerCustomer: p.maxUsesPerCustomer ?? null,
      authorization: p.authorization,
      authorizationLimitPct:
        p.authorizationLimitPct != null ? Number(p.authorizationLimitPct) : null,
      buyQuantity: p.buyQuantity ?? null,
      getQuantity: p.getQuantity ?? null,
      getDiscountPercent:
        p.getDiscountPercent != null ? Number(p.getDiscountPercent) : null,
      preloadOnPaymentScreen: p.preloadOnPaymentScreen,
      displayOrder: p.displayOrder,
      accountingTag: p.accountingTag ?? null,
      scopes: {
        branches: branches.map((s) => ({ branchId: s.branchId, mode: s.mode })),
        pointsOfSale: poss.map((s) => ({
          pointOfSaleId: s.pointOfSaleId,
          mode: s.mode,
        })),
        products: products.map((s) => ({ productId: s.productId, mode: s.mode })),
        variants: variants.map((s) => ({
          productVariantId: s.productVariantId,
          mode: s.mode,
        })),
        categories: categories.map((s) => ({ categoryId: s.categoryId, mode: s.mode })),
        customers: customers.map((s) => ({ customerId: s.customerId, mode: s.mode })),
        paymentMethods: payments.map((s) => ({
          companyPaymentMethodId: s.companyPaymentMethodId,
          mode: s.mode,
        })),
      },
    };
  }

  private computeEffectiveStatus(
    p: Promotion,
  ): 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' {
    if (!p.isActive) return 'INACTIVE';
    const now = Date.now();
    if (p.validUntil) {
      const until = p.validUntil.getTime();
      if (until < now) return 'EXPIRED';
      const daysLeft = (until - now) / (1000 * 60 * 60 * 24);
      if (daysLeft <= 3) return 'EXPIRING_SOON';
    }
    return 'ACTIVE';
  }
}
