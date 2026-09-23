import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import {
  PaymentMethod,
  PaymentStatus,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { DocumentNumberService } from '@modules/transactions/application/document-number.service';
import { User } from '@modules/users/domain/user.entity';
import { LiteStockService } from './lite-stock.service';
import { LitePosSaleDto } from './dto/lite-pos-sale.dto';
import { LiteReceptionDto } from './dto/lite-reception.dto';
import { LitePatchCompanyDto } from './dto/lite-company-patch.dto';

export type LiteCatalogItem = {
  id: string;
  name: string;
  type: ProductType;
  sku: string;
};

export type LitePosCatalogItem = {
  variantId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  unitPrice: number;
  productType: ProductType;
};

export type LiteSalePayment = {
  method: string;
  amount: number;
  reference?: string;
};

export type LiteSaleRecord = {
  id: string;
  companyId: string;
  createdAt: string;
  documentNumber: string;
  status: string;
  method: string;
  userId?: string | null;
  userName?: string | null;
  customerId?: string;
  total: number;
  payments: LiteSalePayment[];
  lines: Array<{
    variantId: string;
    qty: number;
    unitPrice: number;
    name?: string;
  }>;
};

export type LiteReceptionRecord = {
  id: string;
  companyId: string;
  createdAt: string;
  supplierName: string;
  supplierId?: string;
  lines: Array<{ variantId: string; qty: number }>;
};

@Injectable()
export class LiteCommerceService {
  private readonly receptions: LiteReceptionRecord[] = [];

  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepo: Repository<TransactionLine>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepo: Repository<CashSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stock: LiteStockService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async listCatalog(companyId: string): Promise<{ items: LiteCatalogItem[] }> {
    const variants = await this.variantRepo.find({
      where: { companyId },
      relations: ['product'],
      order: { sku: 'ASC' },
    });

    const items: LiteCatalogItem[] = [];
    for (const v of variants) {
      const product = v.product;
      if (!product || product.deletedAt) continue;
      items.push({
        id: v.id,
        name: product.name,
        type: product.productType,
        sku: v.sku,
      });
    }
    return { items };
  }

  async listPosCatalog(
    companyId: string,
  ): Promise<{ items: LitePosCatalogItem[] }> {
    const variants = await this.variantRepo.find({
      where: { companyId },
      relations: ['product'],
      order: { sku: 'ASC' },
    });

    const items: LitePosCatalogItem[] = [];
    for (const v of variants) {
      const product = v.product;
      if (!product || product.deletedAt) continue;
      if (product.productType === ProductType.INSUMO) continue;
      items.push({
        variantId: v.id,
        name: product.name,
        sku: v.sku,
        barcode: v.barcode ?? null,
        unitPrice: Number(v.basePrice ?? 0),
        productType: product.productType,
      });
    }
    return { items };
  }

  async createPosSale(
    companyId: string,
    userId: string,
    dto: LitePosSaleDto,
  ): Promise<{ id: string }> {
    const variantIds = dto.lines.map((l) => l.variantId);
    const variants = await this.variantRepo.find({
      where: { id: In(variantIds), companyId },
      relations: ['product'],
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    for (const line of dto.lines) {
      const variant = byId.get(line.variantId);
      if (!variant) {
        throw new NotFoundException(`Variante no encontrada: ${line.variantId}`);
      }
      const type = variant.product?.productType;
      if (type === ProductType.PHYSICAL) {
        await this.stock.adjustPhysicalStock(
          companyId,
          line.variantId,
          -line.qty,
        );
      }
    }

    const pos = await this.posRepo.findOne({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    const branch =
      (pos?.branchId
        ? await this.branchRepo.findOne({ where: { id: pos.branchId } })
        : null) ??
      (await this.branchRepo.findOne({
        where: { companyId },
        order: { createdAt: 'ASC' },
      }));
    if (!branch?.id) {
      throw new BadRequestException(
        'No hay sucursal configurada para emitir folios de venta',
      );
    }

    const total = Number(dto.total ?? 0);
    const payments = dto.payments ?? [];
    let amountPaid = total;
    let primaryMethodRaw = dto.method;
    const litePaymentsMeta: Array<{
      method: string;
      amount: number;
      reference?: string;
    }> = [];

    if (payments.length > 0) {
      let sum = 0;
      for (const p of payments) {
        const amount = Number(p.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new BadRequestException(
            'Cada pago debe tener amount > 0',
          );
        }
        if (!p.method?.trim()) {
          throw new BadRequestException('Cada pago requiere method');
        }
        sum += amount;
        litePaymentsMeta.push({
          method: p.method.trim().toUpperCase(),
          amount,
          ...(p.reference?.trim()
            ? { reference: p.reference.trim() }
            : {}),
        });
      }
      if (sum + 0.01 < total) {
        throw new BadRequestException(
          `Monto insuficiente: pagado ${sum}, total ${total}`,
        );
      }
      amountPaid = sum;
      primaryMethodRaw = litePaymentsMeta[0]?.method ?? dto.method;
    }

    const paymentMethod = mapPaymentMethod(primaryMethodRaw);
    const change =
      amountPaid > total ? Math.round((amountPaid - total) * 100) / 100 : 0;
    const documentNumber = await this.documentNumbers.allocateNext(
      branch.id,
      TransactionType.SALE,
      companyId,
    );

    const openSession = await this.cashSessionRepo.findOne({
      where: {
        companyId,
        status: CashSessionStatus.OPEN,
        ...(pos?.id ? { pointOfSaleId: pos.id } : {}),
      },
      order: { openedAt: 'DESC' },
    });

    const tx = await this.transactionRepo.save(
      this.transactionRepo.create({
        companyId,
        documentNumber,
        transactionType: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        branchId: branch.id,
        pointOfSaleId: pos?.id,
        storageId: pos?.storageId ?? undefined,
        cashSessionId: openSession?.id,
        customerId: dto.customerId,
        userId,
        subtotal: total,
        taxAmount: 0,
        discountAmount: 0,
        total,
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
        amountPaid,
        completedAt: new Date(),
        metadata: {
          lite: true,
          method: primaryMethodRaw,
          ...(litePaymentsMeta.length > 0
            ? { litePayments: litePaymentsMeta }
            : {}),
          ...(change > 0 ? { change } : {}),
        },
      }),
    );

    let lineNumber = 1;
    for (const line of dto.lines) {
      const variant = byId.get(line.variantId)!;
      const product = variant.product!;
      const qty = Number(line.qty);
      const unitPrice = Number(line.unitPrice);
      const lineTotal = qty * unitPrice;
      await this.transactionLineRepo.save(
        this.transactionLineRepo.create({
          companyId,
          transactionId: tx.id,
          productId: product.id,
          productVariantId: variant.id,
          unitId: variant.unitId,
          lineNumber: lineNumber++,
          productName: product.name,
          productSku: variant.sku,
          quantity: qty,
          unitPrice,
          discountPercentage: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          subtotal: lineTotal,
          total: lineTotal,
        }),
      );
    }

    return { id: tx.id };
  }

  async createReception(
    companyId: string,
    dto: LiteReceptionDto,
  ): Promise<{ id: string }> {
    if (!dto.supplierName?.trim()) {
      throw new BadRequestException('supplierName es requerido');
    }

    const variantIds = dto.lines.map((l) => l.variantId);
    const variants = await this.variantRepo.find({
      where: { id: In(variantIds), companyId },
    });
    const known = new Set(variants.map((v) => v.id));

    for (const line of dto.lines) {
      if (!known.has(line.variantId)) {
        throw new NotFoundException(`Variante no encontrada: ${line.variantId}`);
      }
      await this.stock.adjustPhysicalStock(companyId, line.variantId, line.qty);
    }

    const supplierId = await this.findSupplierIdByName(
      companyId,
      dto.supplierName.trim(),
    );

    const id = randomUUID();
    this.receptions.unshift({
      id,
      companyId,
      createdAt: new Date().toISOString(),
      supplierName: dto.supplierName.trim(),
      supplierId: supplierId ?? undefined,
      lines: dto.lines.map((l) => ({
        variantId: l.variantId,
        qty: l.qty,
      })),
    });
    return { id };
  }

  async listCustomers(companyId: string) {
    const rows = await this.customerRepo.find({
      where: { companyId },
      relations: ['person'],
      order: { createdAt: 'ASC' },
    });
    return {
      items: rows.map((c) => ({
        id: c.id,
        name: personDisplayName(c.person),
        creditLimit: Number(c.creditLimit ?? 0),
        currentBalance: Number(c.currentBalance ?? 0),
        isActive: c.isActive,
      })),
    };
  }

  async listSuppliers(companyId: string) {
    const rows = await this.supplierRepo.find({
      where: { companyId },
      relations: ['person'],
      order: { createdAt: 'ASC' },
    });
    return {
      items: rows.map((s) => ({
        id: s.id,
        name: s.alias || personDisplayName(s.person),
        isActive: s.isActive,
      })),
    };
  }

  async listSales(companyId: string) {
    const rows = await this.transactionRepo.find({
      where: {
        companyId,
        transactionType: TransactionType.SALE,
      },
      order: { createdAt: 'DESC' },
    });

    const userIds = [
      ...new Set(rows.map((t) => t.userId).filter(Boolean)),
    ] as string[];
    const users =
      userIds.length > 0
        ? await this.userRepo.find({ where: { id: In(userIds) } })
        : [];
    const userById = new Map(users.map((u) => [u.id, u.userName]));

    const items: LiteSaleRecord[] = [];
    for (const tx of rows) {
      const lines = await this.transactionLineRepo.find({
        where: { transactionId: tx.id },
        order: { lineNumber: 'ASC' },
      });
      items.push(
        mapSaleRecord(tx, lines, userById.get(tx.userId) ?? null),
      );
    }
    return { items };
  }

  async getSale(companyId: string, saleId: string) {
    const tx = await this.transactionRepo.findOne({
      where: {
        id: saleId,
        companyId,
        transactionType: TransactionType.SALE,
      },
    });
    if (!tx) {
      throw new NotFoundException(`Venta no encontrada: ${saleId}`);
    }
    const lines = await this.transactionLineRepo.find({
      where: { transactionId: tx.id },
      order: { lineNumber: 'ASC' },
    });
    const user = tx.userId
      ? await this.userRepo.findOne({ where: { id: tx.userId } })
      : null;
    return mapSaleRecord(tx, lines, user?.userName ?? null);
  }

  async voidSale(
    companyId: string,
    saleId: string,
    voidedByUserId: string,
    reason?: string,
  ): Promise<LiteSaleRecord> {
    const tx = await this.transactionRepo.findOne({
      where: {
        id: saleId,
        companyId,
        transactionType: TransactionType.SALE,
      },
    });
    if (!tx) {
      throw new NotFoundException(`Venta no encontrada: ${saleId}`);
    }
    if (tx.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('La venta ya está anulada');
    }
    if (tx.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        `Solo se pueden anular ventas completadas (estado: ${tx.status})`,
      );
    }

    const lines = await this.transactionLineRepo.find({
      where: { transactionId: tx.id },
      order: { lineNumber: 'ASC' },
    });

    const variantIds = lines
      .map((l) => l.productVariantId)
      .filter((id): id is string => Boolean(id));
    const variants =
      variantIds.length > 0
        ? await this.variantRepo.find({
            where: { id: In(variantIds), companyId },
            relations: ['product'],
          })
        : [];
    const byId = new Map(variants.map((v) => [v.id, v]));

    for (const line of lines) {
      const variantId = line.productVariantId;
      if (!variantId) continue;
      const variant = byId.get(variantId);
      const type = variant?.product?.productType;
      if (type === ProductType.PHYSICAL) {
        await this.stock.adjustPhysicalStock(
          companyId,
          variantId,
          Number(line.quantity),
        );
      }
    }

    tx.status = TransactionStatus.VOIDED;
    tx.metadata = {
      ...(tx.metadata ?? {}),
      liteVoid: {
        reason: reason?.trim() || null,
        voidedAt: new Date().toISOString(),
        voidedByUserId,
      },
    };
    await this.transactionRepo.save(tx);

    const user = tx.userId
      ? await this.userRepo.findOne({ where: { id: tx.userId } })
      : null;
    return mapSaleRecord(tx, lines, user?.userName ?? null);
  }

  async listReceptions(companyId: string) {
    return {
      items: this.receptions.filter((r) => r.companyId === companyId),
    };
  }

  async getDashboard(companyId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth(),
      1,
    );

    const trendFrom = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth() - 11,
      1,
    );

    const salesTodayRaw = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :startOfDay', { startOfDay })
      .getRawOne<{ total: string; cnt: string }>();

    const salesMtdRaw = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.total), 0)', 'total')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne<{ total: string; cnt: string }>();

    const salesTodayAmount = Number(salesTodayRaw?.total ?? 0);
    const salesTodayCount = Number(salesTodayRaw?.cnt ?? 0);
    const salesMtdAmount = Number(salesMtdRaw?.total ?? 0);
    const salesMtdCount = Number(salesMtdRaw?.cnt ?? 0);
    const averageTicketMtd =
      salesMtdCount > 0 ? Math.round(salesMtdAmount / salesMtdCount) : 0;

    // SQLite: strftime; Postgres suite usa TO_CHAR — Lite corre en SQLite.
    const monthRows = await this.transactionRepo
      .createQueryBuilder('t')
      .select(`strftime('%Y-%m', t.createdAt)`, 'period')
      .addSelect('COALESCE(SUM(t.total), 0)', 'total')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.transactionType = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.createdAt >= :trendFrom', { trendFrom })
      .groupBy(`strftime('%Y-%m', t.createdAt)`)
      .getRawMany<{ period: string; total: string }>();

    const byPeriod = new Map(
      monthRows.map((r) => [r.period, Number(r.total ?? 0)]),
    );
    const salesByMonth: Array<{ period: string; label: string; total: number }> =
      [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(trendFrom.getFullYear(), trendFrom.getMonth() + i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CL', {
        month: 'short',
        year: '2-digit',
      });
      salesByMonth.push({
        period,
        label: label.replace('.', ''),
        total: byPeriod.get(period) ?? 0,
      });
    }

    const stockLowCount = await this.stock.countLowStock(companyId);
    const stock = await this.stock.listStock(companyId);
    const openSessions = await this.cashSessionRepo.count({
      where: { companyId, status: CashSessionStatus.OPEN },
    });

    return {
      salesToday: salesTodayCount,
      salesCount: salesTodayCount,
      salesTodayAmount,
      salesTodayCount,
      salesMtdAmount,
      salesMtdCount,
      averageTicketMtd,
      stockLowCount,
      stockSkuCount: stock.items.length,
      openSessions,
      salesByMonth,
    };
  }

  async getCompanySummary(companyId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const branch =
      (await this.branchRepo.findOne({
        where: { companyId, isHeadquarters: true },
      })) ??
      (await this.branchRepo.findOne({
        where: { companyId },
        order: { createdAt: 'ASC' },
      }));

    const storageId = await this.stock.resolveDefaultStorageId(companyId);
    const storage = storageId
      ? await this.storageRepo.findOne({ where: { id: storageId } })
      : null;

    const pos = await this.posRepo.findOne({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });

    return {
      company: {
        id: company.id,
        razonSocial: company.razonSocial,
        nombreFantasia: company.nombreFantasia,
        rut: company.rut,
        businessActivity: company.businessActivity ?? null,
        address: company.address ?? null,
        commune: company.commune ?? null,
        city: company.city ?? null,
        phone: company.phone ?? null,
        mail: company.mail ?? null,
        defaultCurrency: company.defaultCurrency,
      },
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            isHeadquarters: branch.isHeadquarters,
          }
        : null,
      storage: storage
        ? {
            id: storage.id,
            name: storage.name,
            isDefault: storage.isDefault,
          }
        : null,
      warehouses: storage
        ? [
            {
              id: storage.id,
              name: storage.name,
            },
          ]
        : [],
      pointOfSale: pos
        ? {
            id: pos.id,
            name: pos.name,
            branchId: pos.branchId,
            storageId: pos.storageId,
          }
        : null,
    };
  }

  async patchCompany(companyId: string, dto: LitePatchCompanyDto) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    if (dto.razonSocial != null) company.razonSocial = dto.razonSocial.trim();
    if (dto.nombreFantasia !== undefined) {
      company.nombreFantasia = dto.nombreFantasia?.trim() || null;
    }
    if (dto.rut != null) company.rut = dto.rut.trim();
    if (dto.businessActivity !== undefined) {
      company.businessActivity = dto.businessActivity?.trim() || null;
    }
    if (dto.address !== undefined) {
      company.address = dto.address?.trim() || null;
    }
    if (dto.commune !== undefined) {
      company.commune = dto.commune?.trim() || null;
    }
    if (dto.city !== undefined) {
      company.city = dto.city?.trim() || null;
    }
    if (dto.phone !== undefined) {
      company.phone = dto.phone?.trim() || null;
    }
    if (dto.mail !== undefined) {
      company.mail = dto.mail?.trim() || null;
    }
    await this.companyRepo.save(company);
    return this.getCompanySummary(companyId);
  }

  private async findSupplierIdByName(
    companyId: string,
    name: string,
  ): Promise<string | null> {
    const suppliers = await this.supplierRepo.find({
      where: { companyId },
      relations: ['person'],
    });
    const needle = name.toLowerCase();
    const match = suppliers.find((s) => {
      const alias = (s.alias ?? '').toLowerCase();
      const display = personDisplayName(s.person).toLowerCase();
      return alias === needle || display === needle;
    });
    return match?.id ?? null;
  }
}

function mapSaleRecord(
  tx: Transaction,
  lines: TransactionLine[],
  userName: string | null,
): LiteSaleRecord {
  const method =
    (tx.metadata?.method as string | undefined) ??
    String(tx.paymentMethod ?? PaymentMethod.CASH);
  const total = Number(tx.total ?? 0);
  const metaPayments = tx.metadata?.litePayments as
    | Array<{ method?: string; amount?: number; reference?: string }>
    | undefined;
  const payments: LiteSalePayment[] =
    Array.isArray(metaPayments) && metaPayments.length > 0
      ? metaPayments.map((p) => ({
          method: String(p.method ?? method).toUpperCase(),
          amount: Number(p.amount ?? 0),
          ...(p.reference?.trim() ? { reference: p.reference.trim() } : {}),
        }))
      : [{ method: String(method).toUpperCase(), amount: total }];

  return {
    id: tx.id,
    companyId: tx.companyId,
    createdAt: tx.createdAt.toISOString(),
    documentNumber: tx.documentNumber ?? tx.id,
    status: String(tx.status ?? TransactionStatus.COMPLETED),
    method: String(method).toUpperCase(),
    userId: tx.userId ?? null,
    userName: userName?.trim() || null,
    customerId: tx.customerId,
    total,
    payments,
    lines: lines.map((l) => ({
      variantId: l.productVariantId ?? '',
      qty: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      name: l.productName,
    })),
  };
}

function mapPaymentMethod(raw: string): PaymentMethod {
  const key = raw?.trim().toUpperCase();
  const values = Object.values(PaymentMethod) as string[];
  if (values.includes(key)) {
    return key as PaymentMethod;
  }
  return PaymentMethod.CASH;
}

function personDisplayName(person?: {
  firstName?: string;
  lastName?: string | null;
  businessName?: string | null;
} | null): string {
  if (!person) return '';
  if (person.businessName?.trim()) return person.businessName.trim();
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
}
