import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import {
  CompanyPaymentMethodConfig,
  defaultCompanyPaymentMethodId,
  mergeCompanyAndPos,
  PAYMENT_METHOD_LABELS,
} from '@modules/payment-methods-config';
import { Company, type CompanyBankAccount } from '../domain/company.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import {
  CompanyCheckSettings,
  buildDefaultCompanyCheckSettings,
  sanitizeCompanyCheckSettings,
} from '../domain/company-checks.types';
import { CompanyVoucherKind } from '../domain/company-voucher-kinds.types';
import { CompanyPaymentCatalogService } from './company-payment-catalog.service';
import {
  CompanyMercadoPagoSettings,
  buildDefaultCompanyMercadoPagoSettings,
  readMercadoPagoSettingsFromCompanySettings,
  sanitizeCompanyMercadoPagoSettings,
  toPublicMercadoPagoSettings,
  type CompanyMercadoPagoSettingsPublic,
} from '../domain/company-mercado-pago.types';
import {
  CompanyQuotationSettings,
  buildDefaultCompanyQuotationSettings,
  sanitizeCompanyQuotationSettings,
} from '../domain/company-quotations.types';
import {
  CompanyTipSettings,
  buildDefaultCompanyTipSettings,
  sanitizeCompanyTipSettings,
} from '../domain/company-tips.types';
import {
  buildDefaultCompanyPresaleSettings,
  sanitizeCompanyPresaleSettings,
  type CompanyPresaleSettings,
} from '../domain/company-presales.types';
import {
  CompanyInternalCustomerCreditSettings,
  buildDefaultInternalCustomerCreditSettings,
  sanitizeInternalCustomerCreditSettings,
} from '../domain/company-internal-customer-credit.types';
import {
  CompanyDeferredPaymentSettings,
  buildDefaultCompanyDeferredPaymentSettings,
  sanitizeCompanyDeferredPaymentSettings,
} from '../domain/company-deferred-payment.types';
import {
  CompanyPublicContactSettings,
  buildDefaultCompanyPublicContact,
  sanitizeCompanyPublicContact,
} from '../domain/company-public-contact.types';
import {
  resolveCompanyContactEmail,
  resolveCompanyContactPhone,
  resolveCompanyPublicContact,
} from '../domain/company-contact-resolve.util';
import {
  CompanyEShopFlatSettings,
  buildDefaultCompanyEShopFlatSettings,
  sanitizeCompanyEShopFlatSettings,
} from '../domain/company-eshop-flat.types';
import {
  type CompanyEShopThemeSettings,
  listEShopThemePresetsForAdmin,
  resolveEShopTheme,
  sanitizeCompanyEShopThemeSettings,
} from '../domain/company-eshop-theme.types';
import {
  type CompanyEShopTopBarSettings,
  resolveEShopTopBar,
  sanitizeCompanyEShopTopBarSettings,
} from '../domain/company-eshop-topbar.types';
import {
  type CompanyEShopFooterSettings,
  resolveEShopFooter,
  sanitizeCompanyEShopFooterSettings,
} from '../domain/company-eshop-footer.types';
import {
  type CompanyMenuAboutSettings,
  resolveMenuAbout,
  sanitizeCompanyMenuAboutSettings,
} from '../domain/company-menu-about.types';
import {
  type CompanyMenuFindUsSettings,
  resolveMenuFindUs,
  sanitizeCompanyMenuFindUsSettings,
} from '../domain/company-menu-find-us.types';
import {
  type CompanyMenuThemeSettings,
  type MenuResolvedTheme,
  listMenuThemePresetsForAdmin,
  resolveMenuTheme,
  sanitizeCompanyMenuThemeSettings,
} from '../domain/company-menu-theme.types';
import {
  type CompanyMenuTopBarSettings,
  resolveMenuTopBar,
  sanitizeCompanyMenuTopBarSettings,
} from '../domain/company-menu-topbar.types';
import { sanitizeCompanyMenuFlatSettings } from '../domain/company-menu-flat.types';
import {
  CompanyIdentitySettings,
  resolveCompanyIdentity,
  sanitizeCompanyIdentity,
} from '../domain/company-identity.types';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import {
  alignBranchFromStorage,
  validateEShopOperationalSettingsWithRepos,
} from '@modules/e-shop/application/helpers/eshop-operational-context.util';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ProductModeService } from '@shared/product-mode/product-mode.service';

export interface CompanyDetail {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  siiResolutionNumber: string | null;
  siiResolutionDate: string | null;
  mail: string | null;
  phone: string | null;
  defaultCurrency: string;
  fiscalYearStart?: Date;
  isActive: boolean;
  /** Vertical comercial de la empresa. */
  kaiProduct: 'kaistore' | 'kaifood' | 'kaiservices';
  settings?: Record<string, any>;
  bankAccounts: CompanyBankAccount[];
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(PointOfSale)
    private readonly posRepository: Repository<PointOfSale>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    @InjectRepository(PriceList)
    private readonly priceListRepository: Repository<PriceList>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly paymentCatalog: CompanyPaymentCatalogService,
    private readonly productMode: ProductModeService,
  ) {}

  /**
   * Saldo libro calculado desde transacciones confirmadas para una cuenta bancaria.
   * Sigue el mismo patrón que CashHubsService.getHubBalance.
   */
  async getBankAccountBookBalance(
    companyId: string,
    accountKey: string,
  ): Promise<number> {
    const branchRows = await this.branchRepository.find({
      where: { companyId },
      select: ['id'],
    });
    const branchIds = branchRows.map((b) => b.id).filter(Boolean);
    if (branchIds.length === 0) {
      return 0;
    }

    const qb = this.transactionRepository.createQueryBuilder('tx');

    const result = await qb
      .select(
        `COALESCE(SUM(CASE
          WHEN tx.transactionType IN ('${TransactionType.CAPITAL_CONTRIBUTION}','${TransactionType.CASH_DEPOSIT}') THEN tx.total
          WHEN tx.transactionType = '${TransactionType.PAYMENT_IN}' AND tx.paymentMethod = '${PaymentMethod.TRANSFER}' THEN tx.total
          WHEN tx.transactionType IN (
            '${TransactionType.BANK_TO_CASH_TRANSFER}',
            '${TransactionType.SUPPLIER_PAYMENT}',
            '${TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER}',
            '${TransactionType.PAYROLL_PAYMENT}',
            '${TransactionType.EXPENSE_PAYMENT}',
            '${TransactionType.OPERATING_EXPENSE}'
          ) THEN -tx.total
          ELSE 0
        END), 0)`,
        'bookBalance',
      )
      .where('tx.status = :status', { status: TransactionStatus.CONFIRMED })
      .andWhere('tx.branchId IN (:...branchIds)', { branchIds })
      .andWhere('tx.bankAccountKey = :accountKey', { accountKey })
      .getRawOne<{ bookBalance: string | null }>();

    const n = Number(result?.bookBalance ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Actualiza el saldo cartola (currentBalance) de una cuenta bancaria de la empresa.
   */
  async updateBankAccountBalance(
    companyId: string,
    accountKey: string,
    currentBalance: number,
  ): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    const accounts = company.bankAccounts ?? [];
    const idx = accounts.findIndex((a) => a.accountKey === accountKey);
    if (idx === -1) {
      throw new NotFoundException(`Cuenta bancaria '${accountKey}' no encontrada`);
    }
    accounts[idx] = { ...accounts[idx], currentBalance };
    company.bankAccounts = accounts;
    await this.companyRepository.save(company);
    return this.toDetail(company);
  }

  /**
   * Lista todas las empresas (incluye inactivas opcionalmente).
   */
  async listCompanies(includeInactive = false): Promise<CompanyDetail[]> {
    const where = includeInactive ? {} : { isActive: true };
    const list = await this.companyRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
    return list.map((c) => this.toDetail(c));
  }

  /**
   * Obtiene una empresa por ID.
   */
  async getCompanyById(id: string): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return this.toDetail(company);
  }

  /**
   * Compatibilidad: devuelve la empresa activa (la primera por orden de creación).
   * Sin filas devuelve un placeholder no persistido (compat. con `kai-pos`).
   */
  async getCompany(): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!company) {
      return {
        id: null,
        razonSocial: 'Empresa por defecto',
        nombreFantasia: null,
        businessActivity: null,
        rut: null,
        address: null,
        commune: null,
        city: null,
        siiResolutionNumber: null,
        siiResolutionDate: null,
        mail: null,
        phone: null,
        defaultCurrency: 'CLP',
        isActive: true,
        kaiProduct: 'kaistore',
        bankAccounts: [],
      };
    }
    return this.toDetail(company);
  }

  async createCompany(data: CreateCompanyDto): Promise<CompanyDetail> {
    const rut = data.rut.trim();
    if (!rut) throw new ConflictException('El RUT es requerido');

    const exists = await this.companyRepository.findOne({ where: { rut } });
    if (exists) throw new ConflictException('El RUT ya está registrado');

    const kaiProduct =
      data.kaiProduct ?? this.productMode.defaultCompanyProduct();
    this.productMode.assertCompanyProductAllowed(kaiProduct);

    const company = this.companyRepository.create({
      razonSocial: data.razonSocial.trim(),
      nombreFantasia: data.nombreFantasia?.trim() || null,
      businessActivity: data.businessActivity?.trim() || null,
      rut,
      defaultCurrency: data.defaultCurrency?.trim() || 'CLP',
      isActive: data.isActive !== false,
      address: data.address?.trim() ? data.address.trim() : null,
      mail: data.mail?.trim() ? data.mail.trim() : null,
      phone: data.phone?.trim() ? data.phone.trim() : null,
      kaiProduct,
    });
    const saved = await this.companyRepository.save(company);
    if (data.mail?.trim() || data.phone?.trim()) {
      const settings = { ...(saved.settings ?? {}) };
      settings.publicContact = sanitizeCompanyPublicContact({
        email: data.mail?.trim(),
        phone: data.phone?.trim(),
      });
      saved.settings = settings;
      await this.companyRepository.save(saved);
    }
    return this.toDetail(saved);
  }

  async updateCompanyById(
    id: string,
    data: UpdateCompanyDto & { isActive?: boolean },
  ): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    if (data.rut !== undefined && data.rut.trim() !== company.rut) {
      const conflict = await this.companyRepository.findOne({
        where: { rut: data.rut.trim() },
      });
      if (conflict && conflict.id !== company.id) {
        throw new ConflictException('El RUT ya está registrado');
      }
    }

    if (data.razonSocial !== undefined) {
      company.razonSocial = data.razonSocial.trim();
    }
    if (data.nombreFantasia !== undefined) {
      const v = data.nombreFantasia.trim();
      company.nombreFantasia = v === '' ? null : v;
    }
    if (data.businessActivity !== undefined) {
      const v = data.businessActivity.trim();
      company.businessActivity = v === '' ? null : v;
    }
    if (data.rut !== undefined) {
      company.rut = data.rut.trim();
    }
    if (data.address !== undefined) {
      const v = data.address.trim();
      company.address = v === '' ? null : v;
    }
    if (data.commune !== undefined) {
      const v = data.commune.trim();
      company.commune = v === '' ? null : v;
    }
    if (data.city !== undefined) {
      const v = data.city.trim();
      company.city = v === '' ? null : v;
    }
    if (data.siiResolutionNumber !== undefined) {
      const v = data.siiResolutionNumber.trim();
      company.siiResolutionNumber = v === '' ? null : v;
    }
    if (data.siiResolutionDate !== undefined) {
      company.siiResolutionDate =
        data.siiResolutionDate.trim() === '' ? null : data.siiResolutionDate;
    }
    if (data.mail !== undefined || data.phone !== undefined) {
      const settings = { ...(company.settings ?? {}) };
      const current = resolveCompanyPublicContact(company);
      settings.publicContact = sanitizeCompanyPublicContact({
        ...current,
        ...(data.mail !== undefined
          ? { email: data.mail.trim() || undefined }
          : {}),
        ...(data.phone !== undefined
          ? { phone: data.phone.trim() || undefined }
          : {}),
      });
      company.settings = settings;
    }
    if ((data as any).isActive !== undefined) {
      company.isActive = !!(data as any).isActive;
    }
    if (data.kaiProduct !== undefined) {
      this.productMode.assertCompanyProductAllowed(data.kaiProduct);
      company.kaiProduct = data.kaiProduct;
    }

    await this.companyRepository.save(company);
    return this.toDetail(company);
  }

  async softDeleteCompany(id: string): Promise<{ success: true }> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    company.isActive = false;
    await this.companyRepository.save(company);
    await this.companyRepository.softDelete({ id });
    return { success: true };
  }

  /**
   * Compat. legacy: actualiza la empresa única (la primera activa).
   */
  async updateCompany(data: UpdateCompanyDto): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return this.updateCompanyById(company.id, data);
  }

  /**
   * Lee el catálogo de medios de pago de una empresa (tabla).
   */
  async getPaymentMethods(
    companyId: string,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return this.paymentCatalog.getPaymentMethods(companyId);
  }

  /**
   * Upsert + soft-delete del catálogo de medios de pago.
   */
  async replacePaymentMethods(
    companyId: string,
    list: unknown,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const icc = this.readInternalCustomerCreditFromSettings(
      (company.settings ?? {}) as Record<string, any>,
    );
    let incoming = list;
    if (!icc.enabled && Array.isArray(list)) {
      incoming = list.map((m: any) =>
        m?.method === PaymentMethod.INTERNAL_CREDIT
          ? { ...m, isActive: false }
          : m,
      );
    }
    const finalList = await this.paymentCatalog.replacePaymentMethods(
      companyId,
      incoming,
    );
    if (!icc.enabled) {
      const internalCreditIds = new Set(
        finalList
          .filter((m) => m.method === PaymentMethod.INTERNAL_CREDIT)
          .map((m) => m.id),
      );
      if (internalCreditIds.size > 0) {
        await this.paymentCatalog.applyPaymentMethodToggleOnAllPointsOfSale(
          companyId,
          internalCreditIds,
          false,
        );
      }
    }
    return finalList;
  }

  /**
   * Lee la configuración de cheques de una empresa.
   * Si no existe en `settings.checks`, devuelve el default sin persistir.
   */
  async getCheckSettings(companyId: string): Promise<CompanyCheckSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.checks;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyCheckSettings();
    }
    return sanitizeCompanyCheckSettings(raw);
  }

  /**
   * Catálogo de tipos de voucher (tabla).
   */
  async getVoucherKinds(companyId: string): Promise<CompanyVoucherKind[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return this.paymentCatalog.listVoucherKinds(companyId);
  }

  /**
   * Upsert + soft-delete de tipos de voucher.
   */
  async replaceVoucherKinds(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyVoucherKind[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return this.paymentCatalog.replaceVoucherKinds(companyId, raw);
  }

  async getPosPaymentMethodsViaCatalog(
    posId: string,
    companyId: string,
  ) {
    return this.paymentCatalog.getPosPaymentMethods(posId, companyId);
  }

  async replacePosPaymentMethodsViaCatalog(
    posId: string,
    companyId: string,
    list: unknown,
  ) {
    return this.paymentCatalog.replacePosPaymentMethods(posId, companyId, list);
  }

  async getEffectivePaymentMethodsForPos(posId: string, companyId: string) {
    const catalog = await this.paymentCatalog.getPaymentMethods(companyId);
    const list = await this.paymentCatalog.getPosPaymentMethods(
      posId,
      companyId,
    );
    const merged = mergeCompanyAndPos(catalog, list);
    const kinds = await this.paymentCatalog.listVoucherKinds(companyId);
    const kindsById = new Map(kinds.map((k) => [k.id, k]));
    return merged.map((m) => {
      if (m.method !== PaymentMethod.VOUCHER) return m;
      const cmp = catalog.find((c) => c.id === m.companyPaymentMethodId);
      const kind = cmp?.voucherKindId
        ? kindsById.get(cmp.voucherKindId)
        : undefined;
      if (!kind || !kind.isActive) {
        return { ...m, voucherKind: null, voucherKinds: [] };
      }
      const voucherKind = {
        id: kind.id,
        code: kind.code,
        name: kind.name,
        faceValueMode: kind.faceValueMode,
        defaultFaceValue: kind.defaultFaceValue ?? null,
        requireFaceValue:
          kind.faceValueMode === 'OPEN' ? true : kind.requireFaceValue,
        defaultIssuerName: kind.defaultIssuerName ?? null,
      };
      return {
        ...m,
        label:
          m.alias?.trim() ||
          kind.name ||
          PAYMENT_METHOD_LABELS[m.method] ||
          m.method,
        voucherKind,
        voucherKinds: [
          {
            code: kind.code,
            name: kind.name,
            requireFaceValue:
              kind.faceValueMode === 'FIXED' || kind.faceValueMode === 'OPEN',
            defaultIssuerName: kind.defaultIssuerName ?? null,
          },
        ],
      };
    });
  }

  /**
   * Reemplaza la configuración de cheques de una empresa.
   * Sincroniza el catálogo `paymentMethods` para `CHECK`:
   * `isActive` solo si `enabled && receiveChecks` (módulo de cheques activo
   * y la empresa acepta cheques entrantes).
   * En cadena: actualiza `points_of_sale.settings.paymentMethods` para
   * cada fila ligada a un medio empresa tipo CHECK (`isEnabled` alineado
   * con ese mismo criterio).
   */
  async replaceCheckSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyCheckSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyCheckSettings(raw);
    const checkActiveForPos =
      validated.enabled === true && validated.receiveChecks === true;

    const settings = { ...(company.settings ?? {}) };
    settings.checks = validated;
    company.settings = settings;
    await this.companyRepository.save(company);

    const checkCompanyMethodIds = new Set(
      await this.paymentCatalog.setPaymentMethodsActiveByMethod(
        companyId,
        PaymentMethod.CHECK,
        checkActiveForPos,
      ),
    );
    if (checkCompanyMethodIds.size > 0) {
      await this.paymentCatalog.applyPaymentMethodToggleOnAllPointsOfSale(
        companyId,
        checkCompanyMethodIds,
        checkActiveForPos,
      );
    }

    return validated;
  }

  async getMercadoPagoSettings(
    companyId: string,
    options?: { maskSecrets?: boolean },
  ): Promise<CompanyMercadoPagoSettings | CompanyMercadoPagoSettingsPublic> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = readMercadoPagoSettingsFromCompanySettings(
      company.settings as Record<string, unknown> | undefined,
    );
    if (options?.maskSecrets !== false) {
      return toPublicMercadoPagoSettings(settings);
    }
    return settings;
  }

  async getMercadoPagoSettingsInternal(
    companyId: string,
  ): Promise<CompanyMercadoPagoSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return readMercadoPagoSettingsFromCompanySettings(
      company.settings as Record<string, unknown> | undefined,
    );
  }

  /** Empresas con access token MP configurado (webhooks multi-tenant). */
  async listCompanyIdsWithMercadoPago(): Promise<string[]> {
    const rows = await this.companyRepository
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .where(`NULLIF(TRIM(c.settings->'mercadoPago'->>'accessToken'), '') IS NOT NULL`)
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  async replaceMercadoPagoSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyMercadoPagoSettingsPublic> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const previous = readMercadoPagoSettingsFromCompanySettings(
      company.settings as Record<string, unknown> | undefined,
    );
    const validated = sanitizeCompanyMercadoPagoSettings(raw, previous);
    const settings = { ...(company.settings ?? {}) };
    settings.mercadoPago = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return toPublicMercadoPagoSettings(validated);
  }

  private async applyPaymentMethodToggleOnAllPointsOfSale(
    companyId: string,
    companyPaymentMethodIds: Set<string>,
    isEnabled: boolean,
  ): Promise<void> {
    await this.paymentCatalog.applyPaymentMethodToggleOnAllPointsOfSale(
      companyId,
      companyPaymentMethodIds,
      isEnabled,
    );
  }

  private readInternalCustomerCreditFromSettings(
    settings: Record<string, any>,
  ): CompanyInternalCustomerCreditSettings {
    const raw = settings.internalCustomerCredit;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultInternalCustomerCreditSettings();
    }
    return sanitizeInternalCustomerCreditSettings(raw);
  }

  /**
   * Lee la política global de crédito interno para clientes.
   */
  async getInternalCustomerCreditSettings(
    companyId: string,
  ): Promise<CompanyInternalCustomerCreditSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = (company.settings ?? {}) as Record<string, any>;
    return this.readInternalCustomerCreditFromSettings(settings);
  }

  /**
   * Política + medio empresa `INTERNAL_CREDIT` activo (para POS/operadores).
   */
  async getInternalCustomerCreditContext(companyId: string): Promise<{
    internalCustomerCredit: CompanyInternalCustomerCreditSettings;
    internalCreditPaymentMethod: {
      id: string;
      label: string;
    } | null;
  }> {
    const internalCustomerCredit =
      await this.getInternalCustomerCreditSettings(companyId);
    if (!internalCustomerCredit.enabled) {
      return { internalCustomerCredit, internalCreditPaymentMethod: null };
    }
    const catalog = await this.getPaymentMethods(companyId);
    const row = catalog.find(
      (m) => m.method === PaymentMethod.INTERNAL_CREDIT && m.isActive,
    );
    if (!row) {
      return { internalCustomerCredit, internalCreditPaymentMethod: null };
    }
    return {
      internalCustomerCredit,
      internalCreditPaymentMethod: {
        id: row.id,
        label: row.alias?.trim() || 'Crédito interno',
      },
    };
  }

  /**
   * Garantiza una fila `INTERNAL_CREDIT` en el catálogo empresa (tabla).
   */
  private async syncInternalCreditCatalogEntry(
    companyId: string,
    active: boolean,
  ): Promise<Set<string>> {
    const catalog = await this.paymentCatalog.getPaymentMethods(companyId);
    const existing = catalog.find(
      (m) => m.method === PaymentMethod.INTERNAL_CREDIT,
    );
    const internalCreditCompanyIds = new Set<string>();
    if (existing) {
      internalCreditCompanyIds.add(existing.id);
      await this.paymentCatalog.setPaymentMethodsActiveByMethod(
        companyId,
        PaymentMethod.INTERNAL_CREDIT,
        active,
      );
      return internalCreditCompanyIds;
    }
    if (!active) {
      return internalCreditCompanyIds;
    }
    const id = defaultCompanyPaymentMethodId(PaymentMethod.INTERNAL_CREDIT);
    const maxOrder = catalog.reduce(
      (max, m) => Math.max(max, m.displayOrder),
      -1,
    );
    await this.paymentCatalog.replacePaymentMethods(companyId, [
      ...catalog,
      {
        id,
        method: PaymentMethod.INTERNAL_CREDIT,
        alias: null,
        displayOrder: maxOrder + 1,
        isActive: true,
        requireReference: false,
        bankAccountKey: null,
        metadata: null,
        voucherKindId: null,
      },
    ]);
    internalCreditCompanyIds.add(id);
    return internalCreditCompanyIds;
  }

  /**
   * Persiste `settings.internalCustomerCredit` y en cascada deja
   * `INTERNAL_CREDIT` en catálogo empresa y POS alineados con `enabled`.
   */
  async replaceInternalCustomerCreditSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyInternalCustomerCreditSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeInternalCustomerCreditSettings(raw);
    const active = validated.enabled === true;

    const settings = { ...(company.settings ?? {}) };
    settings.internalCustomerCredit = validated;
    company.settings = settings;
    await this.companyRepository.save(company);

    const internalCreditCompanyIds = await this.syncInternalCreditCatalogEntry(
      companyId,
      active,
    );

    if (internalCreditCompanyIds.size > 0) {
      await this.applyPaymentMethodToggleOnAllPointsOfSale(
        companyId,
        internalCreditCompanyIds,
        active,
      );
    }

    return validated;
  }

  /**
   * Lee la configuración de cotizaciones de una empresa.
   * Si no existe en `settings.quotations`, devuelve los defaults sin
   * persistir.
   */
  async getQuotationSettings(
    companyId: string,
  ): Promise<CompanyQuotationSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.quotations;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyQuotationSettings();
    }
    return sanitizeCompanyQuotationSettings(raw);
  }

  /**
   * Reemplaza la configuración de cotizaciones de una empresa.
   * Aplica `sanitizeCompanyQuotationSettings` para garantizar invariantes
   * (rangos de días, default <= max, etc.).
   */
  async replaceQuotationSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyQuotationSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyQuotationSettings(raw);
    const settings = { ...(company.settings ?? {}) };
    settings.quotations = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  /**
   * Lee la configuración de propinas KaiFood.
   * Si no existe en `settings.tips`, devuelve defaults (enabled: false).
   */
  async getTipSettings(companyId: string): Promise<CompanyTipSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.tips;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyTipSettings();
    }
    return sanitizeCompanyTipSettings(raw);
  }

  /**
   * Reemplaza la configuración de propinas.
   * Solo permitido en deploys KaiFood / Suite.
   */
  async replaceTipSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyTipSettings> {
    if (!this.productMode.isKaiFood()) {
      throw new BadRequestException(
        'La configuración de propinas solo aplica a KaiFood (o Suite).',
      );
    }
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyTipSettings(raw);
    const settings = { ...(company.settings ?? {}) };
    settings.tips = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async getPresaleSettings(companyId: string): Promise<CompanyPresaleSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.presales;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyPresaleSettings();
    }
    return sanitizeCompanyPresaleSettings(raw);
  }

  async replacePresaleSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyPresaleSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyPresaleSettings(raw);
    const settings = { ...(company.settings ?? {}) };
    settings.presales = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async getDeferredPaymentSettings(
    companyId: string,
  ): Promise<CompanyDeferredPaymentSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.deferredPayment;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyDeferredPaymentSettings();
    }
    return sanitizeCompanyDeferredPaymentSettings(raw);
  }

  async replaceDeferredPaymentSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyDeferredPaymentSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyDeferredPaymentSettings(raw);
    const settings = { ...(company.settings ?? {}) };
    settings.deferredPayment = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async findByEShopPublicSlug(slug: string): Promise<Company | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    return this.companyRepository
      .createQueryBuilder('c')
      .where("LOWER(TRIM(c.settings->>'eShopPublicSlug')) = :slug", {
        slug: normalized,
      })
      .andWhere('c.isActive = :active', { active: true })
      .getOne();
  }

  async findByMenuPublicSlug(slug: string): Promise<Company | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    return this.companyRepository
      .createQueryBuilder('c')
      .where("LOWER(TRIM(c.settings->>'menuPublicSlug')) = :slug", {
        slug: normalized,
      })
      .andWhere('c.isActive = :active', { active: true })
      .getOne();
  }

  async getPublicContactSettings(
    companyId: string,
  ): Promise<CompanyPublicContactSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return resolveCompanyPublicContact(company);
  }

  async replacePublicContactSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyPublicContactSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const validated = sanitizeCompanyPublicContact(raw);
    const settings = { ...(company.settings ?? {}) };
    settings.publicContact = validated;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async getCompanyIdentitySettings(
    companyId: string,
  ): Promise<CompanyIdentitySettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return resolveCompanyIdentity(company.settings as Record<string, unknown>);
  }

  async replaceCompanyIdentitySettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyIdentitySettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const validated = sanitizeCompanyIdentity(raw);
    const settings = { ...(company.settings ?? {}) };
    const hasValues = validated.tagline || validated.brandManifest;
    if (hasValues) {
      settings.companyIdentity = validated;
    } else {
      delete settings.companyIdentity;
    }
    delete settings.companyTagline;
    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async getEShopFlatSettings(companyId: string): Promise<CompanyEShopFlatSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return sanitizeCompanyEShopFlatSettings(
      company.settings as Record<string, unknown>,
    );
  }

  async replaceEShopFlatSettings(
    companyId: string,
    raw: Partial<CompanyEShopFlatSettings>,
  ): Promise<CompanyEShopFlatSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const current = sanitizeCompanyEShopFlatSettings(
      company.settings as Record<string, unknown>,
    );
    const merged: CompanyEShopFlatSettings = {
      ...current,
      ...raw,
      eShopFeaturedProductVariantIds:
        raw.eShopFeaturedProductVariantIds ?? current.eShopFeaturedProductVariantIds,
      eShopFeaturedProductIds:
        raw.eShopFeaturedProductIds ?? current.eShopFeaturedProductIds,
    };

    let operational = merged;
    if (merged.eShopDefaultStorageId?.trim()) {
      const storage = await this.storageRepository.findOne({
        where: {
          id: merged.eShopDefaultStorageId.trim(),
          companyId,
          deletedAt: IsNull(),
        },
      });
      operational = alignBranchFromStorage(merged, storage ?? undefined);
    }

    const touchesOperational =
      raw.eShopDefaultBranchId !== undefined ||
      raw.eShopDefaultStorageId !== undefined ||
      raw.eShopDefaultPriceListId !== undefined;

    if (operational.eShopEnabled && touchesOperational) {
      await validateEShopOperationalSettingsWithRepos(companyId, operational, {
        branchRepo: this.branchRepository,
        storageRepo: this.storageRepository,
        priceListRepo: this.priceListRepository,
      });
    }

    const settings = { ...(company.settings ?? {}) };
    settings.eShopEnabled = merged.eShopEnabled;
    settings.eShopPublicSlug = merged.eShopPublicSlug;
    settings.eShopFeaturedProductVariantIds = merged.eShopFeaturedProductVariantIds;
    settings.eShopFeaturedProductIds = merged.eShopFeaturedProductIds;
    settings.eShopFreeShippingThreshold = merged.eShopFreeShippingThreshold;
    settings.eShopShippingMode = merged.eShopShippingMode;
    settings.eShopDefaultBranchId = operational.eShopDefaultBranchId;
    settings.eShopDefaultPriceListId = operational.eShopDefaultPriceListId;
    settings.eShopDefaultStorageId = operational.eShopDefaultStorageId;
    settings.eShopHeroSliderAutoplaySeconds = merged.eShopHeroSliderAutoplaySeconds;
    settings.eShopStockPolicy = merged.eShopStockPolicy;
    settings.eShopCustomerPortalEnabled = merged.eShopCustomerPortalEnabled;
    settings.eShopRegistrationRequireRut = merged.eShopRegistrationRequireRut;
    settings.eShopShowDebtsInPortal = merged.eShopShowDebtsInPortal;
    company.settings = settings;
    await this.companyRepository.save(company);
    return sanitizeCompanyEShopFlatSettings(
      company.settings as Record<string, unknown>,
    );
  }

  async getEShopThemeSettings(companyId: string): Promise<{
    theme: CompanyEShopThemeSettings;
    resolved: ReturnType<typeof resolveEShopTheme>;
    presets: ReturnType<typeof listEShopThemePresetsForAdmin>;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const theme = sanitizeCompanyEShopThemeSettings(settings);
    return {
      theme,
      resolved: resolveEShopTheme(settings),
      presets: listEShopThemePresetsForAdmin(),
    };
  }

  async replaceEShopThemeSettings(
    companyId: string,
    raw: Partial<CompanyEShopThemeSettings>,
  ): Promise<CompanyEShopThemeSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const current = sanitizeCompanyEShopThemeSettings(
      company.settings as Record<string, unknown>,
    );
    const merged: CompanyEShopThemeSettings = {
      templateId: raw.templateId ?? current.templateId,
      tokenOverrides: {
        ...current.tokenOverrides,
        ...(raw.tokenOverrides ?? {}),
      },
    };
    const sanitized = sanitizeCompanyEShopThemeSettings({
      eShopTemplateId: merged.templateId,
      eShopThemeTokenOverrides: merged.tokenOverrides,
    });

    const settings = { ...(company.settings ?? {}) };
    settings.eShopTemplateId = sanitized.templateId;
    settings.eShopThemeTokenOverrides = sanitized.tokenOverrides;
    company.settings = settings;
    await this.companyRepository.save(company);
    return sanitized;
  }

  async getEShopTopBarSettings(companyId: string): Promise<{
    topBar: CompanyEShopTopBarSettings;
    resolved: CompanyEShopTopBarSettings;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const topBar = sanitizeCompanyEShopTopBarSettings(settings?.eShopTopBar);
    return {
      topBar,
      resolved: resolveEShopTopBar(settings),
    };
  }

  async replaceEShopTopBarSettings(
    companyId: string,
    raw: Partial<CompanyEShopTopBarSettings>,
  ): Promise<CompanyEShopTopBarSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const current = sanitizeCompanyEShopTopBarSettings(
      (company.settings as Record<string, unknown>)?.eShopTopBar,
    );
    const merged = sanitizeCompanyEShopTopBarSettings({
      showLogo: raw.showLogo ?? current.showLogo,
      showCompanyName: raw.showCompanyName ?? current.showCompanyName,
      showCart: raw.showCart ?? current.showCart,
      navLinks: raw.navLinks ?? current.navLinks,
    });

    const settings = { ...(company.settings ?? {}) };
    settings.eShopTopBar = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getEShopFooterSettings(companyId: string): Promise<{
    footer: CompanyEShopFooterSettings;
    resolved: CompanyEShopFooterSettings;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const footer = sanitizeCompanyEShopFooterSettings(settings?.eShopFooter);
    return {
      footer,
      resolved: resolveEShopFooter(settings),
    };
  }

  async replaceEShopFooterSettings(
    companyId: string,
    raw: Partial<CompanyEShopFooterSettings>,
  ): Promise<CompanyEShopFooterSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const current = sanitizeCompanyEShopFooterSettings(
      (company.settings as Record<string, unknown>)?.eShopFooter,
    );
    const merged = sanitizeCompanyEShopFooterSettings({
      showLogo: raw.showLogo ?? current.showLogo,
      showTagline: raw.showTagline ?? current.showTagline,
      showBrandManifest: raw.showBrandManifest ?? current.showBrandManifest,
      showContactBlock: raw.showContactBlock ?? current.showContactBlock,
      showSocialLinks: raw.showSocialLinks ?? current.showSocialLinks,
      copyrightSuffix: raw.copyrightSuffix ?? current.copyrightSuffix,
      linkGroups: raw.linkGroups ?? current.linkGroups,
    });

    const settings = { ...(company.settings ?? {}) };
    settings.eShopFooter = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getMenuTopBarSettings(companyId: string): Promise<{
    topBar: CompanyMenuTopBarSettings;
    resolved: CompanyMenuTopBarSettings;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const topBar = sanitizeCompanyMenuTopBarSettings(settings?.menuTopBar);
    return { topBar, resolved: resolveMenuTopBar(settings) };
  }

  async replaceMenuTopBarSettings(
    companyId: string,
    raw: Partial<CompanyMenuTopBarSettings>,
  ): Promise<CompanyMenuTopBarSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const current = sanitizeCompanyMenuTopBarSettings(
      (company.settings as Record<string, unknown>)?.menuTopBar,
    );
    const merged = sanitizeCompanyMenuTopBarSettings({
      showLogo: raw.showLogo ?? current.showLogo,
      showCompanyName: raw.showCompanyName ?? current.showCompanyName,
      navLinks: raw.navLinks ?? current.navLinks,
    });
    const settings = { ...(company.settings ?? {}) };
    settings.menuTopBar = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getMenuAboutSettings(companyId: string): Promise<{
    about: CompanyMenuAboutSettings;
    resolved: CompanyMenuAboutSettings;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const about = sanitizeCompanyMenuAboutSettings(settings?.menuAbout);
    return { about, resolved: resolveMenuAbout(settings) };
  }

  async replaceMenuAboutSettings(
    companyId: string,
    raw: Partial<CompanyMenuAboutSettings>,
  ): Promise<CompanyMenuAboutSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const current = sanitizeCompanyMenuAboutSettings(
      (company.settings as Record<string, unknown>)?.menuAbout,
    );
    const merged = sanitizeCompanyMenuAboutSettings({
      title: raw.title ?? current.title,
      body: raw.body ?? current.body,
    });
    const settings = { ...(company.settings ?? {}) };
    settings.menuAbout = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getMenuFindUsSettings(companyId: string): Promise<{
    findUs: CompanyMenuFindUsSettings;
    resolved: CompanyMenuFindUsSettings;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const findUs = sanitizeCompanyMenuFindUsSettings(settings?.menuFindUs);
    return { findUs, resolved: resolveMenuFindUs(settings) };
  }

  async replaceMenuFindUsSettings(
    companyId: string,
    raw: Partial<CompanyMenuFindUsSettings>,
  ): Promise<CompanyMenuFindUsSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const current = sanitizeCompanyMenuFindUsSettings(
      (company.settings as Record<string, unknown>)?.menuFindUs,
    );
    const merged = sanitizeCompanyMenuFindUsSettings({ ...current, ...raw });
    const settings = { ...(company.settings ?? {}) };
    settings.menuFindUs = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getMenuThemeSettings(companyId: string): Promise<{
    theme: CompanyMenuThemeSettings;
    resolved: MenuResolvedTheme;
    presets: ReturnType<typeof listMenuThemePresetsForAdmin>;
  }> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = company.settings as Record<string, unknown>;
    const theme = sanitizeCompanyMenuThemeSettings(settings?.menuTheme);
    return {
      theme,
      resolved: resolveMenuTheme(settings),
      presets: listMenuThemePresetsForAdmin(),
    };
  }

  async replaceMenuThemeSettings(
    companyId: string,
    raw: Partial<CompanyMenuThemeSettings>,
  ): Promise<CompanyMenuThemeSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const current = sanitizeCompanyMenuThemeSettings(
      (company.settings as Record<string, unknown>)?.menuTheme,
    );
    const merged = sanitizeCompanyMenuThemeSettings({
      templateId: raw.templateId ?? current.templateId,
      tokenOverrides: raw.tokenOverrides ?? current.tokenOverrides,
    });
    const settings = { ...(company.settings ?? {}) };
    settings.menuTheme = merged;
    company.settings = settings;
    await this.companyRepository.save(company);
    return merged;
  }

  async getMenuHeroSliderAutoplaySeconds(companyId: string): Promise<number> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return sanitizeCompanyMenuFlatSettings(
      company.settings as Record<string, unknown>,
    ).menuHeroSliderAutoplaySeconds;
  }

  async replaceMenuHeroSliderAutoplaySeconds(
    companyId: string,
    autoplaySeconds: number,
  ): Promise<number> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const settings = { ...(company.settings ?? {}) } as Record<string, unknown>;
    const next = sanitizeCompanyMenuFlatSettings({
      ...settings,
      menuHeroSliderAutoplaySeconds: autoplaySeconds,
    });
    settings.menuHeroSliderAutoplaySeconds =
      next.menuHeroSliderAutoplaySeconds;
    company.settings = settings;
    await this.companyRepository.save(company);
    return next.menuHeroSliderAutoplaySeconds;
  }

  async addBankAccount(
    companyId: string | null,
    accountData: PersonBankAccountDto,
  ): Promise<CompanyDetail> {
    const company = companyId
      ? await this.companyRepository.findOne({ where: { id: companyId } })
      : await this.companyRepository.findOne({
          where: { isActive: true },
          order: { createdAt: 'ASC' },
        });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (!company.bankAccounts) {
      company.bankAccounts = [];
    }

    const accountKey = `${accountData.bankName}_${accountData.accountNumber}_${Date.now()}`;
    const newAccount: CompanyBankAccount = { ...accountData, accountKey };

    if (newAccount.isPrimary) {
      company.bankAccounts = company.bankAccounts.map((acc) => ({
        ...acc,
        isPrimary: false,
      }));
    }

    company.bankAccounts.push(newAccount);
    await this.companyRepository.save(company);
    return this.toDetail(company);
  }

  private toDetail(company: Company): CompanyDetail {
    const resolutionDate =
      company.siiResolutionDate != null
        ? String(company.siiResolutionDate).slice(0, 10)
        : null;
    return {
      id: company.id,
      razonSocial: company.razonSocial,
      nombreFantasia: company.nombreFantasia ?? null,
      businessActivity: company.businessActivity ?? null,
      rut: company.rut,
      address: company.address?.trim() ? company.address.trim() : null,
      commune: company.commune?.trim() ? company.commune.trim() : null,
      city: company.city?.trim() ? company.city.trim() : null,
      siiResolutionNumber: company.siiResolutionNumber?.trim()
        ? company.siiResolutionNumber.trim()
        : null,
      siiResolutionDate: resolutionDate,
      mail: resolveCompanyContactEmail(company),
      phone: resolveCompanyContactPhone(company),
      defaultCurrency: company.defaultCurrency,
      fiscalYearStart: company.fiscalYearStart,
      isActive: company.isActive,
      kaiProduct: company.kaiProduct ?? 'kaistore',
      settings: company.settings || {},
      bankAccounts: company.bankAccounts || [],
    };
  }
}
