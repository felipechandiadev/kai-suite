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
  buildDefaultCompanyCatalog,
  defaultCompanyPaymentMethodId,
  validateCompanyPaymentMethods,
} from '@modules/payment-methods-config';
import { Company, type CompanyBankAccount } from '../domain/company.entity';
import {
  CompanyCheckSettings,
  buildDefaultCompanyCheckSettings,
  sanitizeCompanyCheckSettings,
} from '../domain/company-checks.types';
import {
  CompanyQuotationSettings,
  buildDefaultCompanyQuotationSettings,
  sanitizeCompanyQuotationSettings,
} from '../domain/company-quotations.types';
import {
  CompanyInternalCustomerCreditSettings,
  buildDefaultInternalCustomerCreditSettings,
  sanitizeInternalCustomerCreditSettings,
} from '../domain/company-internal-customer-credit.types';
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
  CompanyIdentitySettings,
  resolveCompanyIdentity,
  sanitizeCompanyIdentity,
} from '../domain/company-identity.types';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
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

export interface CompanyDetail {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string | null;
  address: string | null;
  mail: string | null;
  phone: string | null;
  defaultCurrency: string;
  fiscalYearStart?: Date;
  isActive: boolean;
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
  ) {}

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
   * Sin filas devuelve un placeholder no persistido (compat. con `pwa-pos`).
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
        mail: null,
        phone: null,
        defaultCurrency: 'CLP',
        isActive: true,
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
   * Lee el catálogo de medios de pago de una empresa.
   * Si no existe en `settings.paymentMethods`, devuelve un set por defecto
   * (no se persiste hasta que el admin guarde explícitamente).
   */
  async getPaymentMethods(
    companyId: string,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.paymentMethods;
    if (!Array.isArray(raw) || raw.length === 0) {
      return buildDefaultCompanyCatalog();
    }
    try {
      return validateCompanyPaymentMethods(raw);
    } catch {
      // Si lo persistido es inválido, no rompemos el GET; devolvemos default.
      return buildDefaultCompanyCatalog();
    }
  }

  /**
   * Reemplaza el catálogo de medios de pago de una empresa.
   * Hace bulk-replace con validación de unicidad (alias por método, ids).
   */
  async replacePaymentMethods(
    companyId: string,
    list: unknown,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    let validated: CompanyPaymentMethodConfig[];
    try {
      validated = validateCompanyPaymentMethods(list);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Configuración inválida',
      );
    }
    const settings = { ...(company.settings ?? {}) };
    const icc = this.readInternalCustomerCreditFromSettings(settings);
    const internalCreditIds = new Set<string>();
    const finalList = !icc.enabled
      ? validated.map((m) => {
          if (m.method === PaymentMethod.INTERNAL_CREDIT) {
            internalCreditIds.add(m.id);
            return { ...m, isActive: false };
          }
          return m;
        })
      : validated;
    settings.paymentMethods = finalList;
    company.settings = settings;
    await this.companyRepository.save(company);
    if (!icc.enabled && internalCreditIds.size > 0) {
      await this.applyPaymentMethodToggleOnAllPointsOfSale(
        companyId,
        internalCreditIds,
        false,
      );
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

    const checkCompanyMethodIds = new Set<string>();

    if (Array.isArray(settings.paymentMethods)) {
      try {
        const list = validateCompanyPaymentMethods(settings.paymentMethods);
        const next = list.map((m) => {
          if (m.method === PaymentMethod.CHECK) {
            checkCompanyMethodIds.add(m.id);
            return { ...m, isActive: checkActiveForPos };
          }
          return m;
        });
        settings.paymentMethods = next;
      } catch {
        // Si el catálogo es inválido no rompemos la actualización de
        // settings.checks; queda como estaba.
      }
    }

    company.settings = settings;
    await this.companyRepository.save(company);

    if (checkCompanyMethodIds.size > 0) {
      await this.applyPaymentMethodToggleOnAllPointsOfSale(
        companyId,
        checkCompanyMethodIds,
        checkActiveForPos,
      );
    }

    return validated;
  }

  /**
   * Alinea `isEnabled` en `points_of_sale.settings.paymentMethods` para
   * filas cuyo `companyPaymentMethodId` está en el conjunto dado.
   */
  private async applyPaymentMethodToggleOnAllPointsOfSale(
    companyId: string,
    companyPaymentMethodIds: Set<string>,
    isEnabled: boolean,
  ): Promise<void> {
    const poses = await this.posRepository.find({
      where: { companyId, deletedAt: IsNull() },
    });
    for (const pos of poses) {
      const raw = pos.settings?.paymentMethods;
      if (!Array.isArray(raw) || raw.length === 0) continue;
      let changed = false;
      const next = raw.map((row: Record<string, unknown>) => {
        const pid =
          typeof row.companyPaymentMethodId === 'string'
            ? row.companyPaymentMethodId
            : '';
        if (!companyPaymentMethodIds.has(pid)) {
          return row;
        }
        if (row.isEnabled !== isEnabled) {
          changed = true;
        }
        return { ...row, isEnabled };
      });
      if (changed) {
        pos.settings = { ...(pos.settings ?? {}), paymentMethods: next };
        await this.posRepository.save(pos);
      }
    }
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
   * Garantiza una fila `INTERNAL_CREDIT` en el catálogo empresa y devuelve su id.
   */
  private syncInternalCreditCatalogEntry(
    settings: Record<string, any>,
    active: boolean,
  ): { settings: Record<string, any>; internalCreditCompanyIds: Set<string> } {
    const internalCreditCompanyIds = new Set<string>();
    let list: CompanyPaymentMethodConfig[];
    if (Array.isArray(settings.paymentMethods)) {
      try {
        list = validateCompanyPaymentMethods(settings.paymentMethods);
      } catch {
        list = buildDefaultCompanyCatalog();
      }
    } else {
      list = buildDefaultCompanyCatalog();
    }

    const idx = list.findIndex((m) => m.method === PaymentMethod.INTERNAL_CREDIT);
    if (idx >= 0) {
      const id = list[idx].id;
      internalCreditCompanyIds.add(id);
      list[idx] = { ...list[idx], isActive: active };
    } else if (active) {
      const id = defaultCompanyPaymentMethodId(PaymentMethod.INTERNAL_CREDIT);
      internalCreditCompanyIds.add(id);
      const maxOrder = list.reduce(
        (max, m) => Math.max(max, m.displayOrder),
        -1,
      );
      list.push({
        id,
        method: PaymentMethod.INTERNAL_CREDIT,
        alias: null,
        displayOrder: maxOrder + 1,
        isActive: true,
        requireReference: false,
        bankAccountKey: null,
        metadata: null,
      });
    }

    settings.paymentMethods = list;
    return { settings, internalCreditCompanyIds };
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

    const { settings: nextSettings, internalCreditCompanyIds } =
      this.syncInternalCreditCatalogEntry(settings, active);

    company.settings = nextSettings;
    await this.companyRepository.save(company);

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
    return {
      id: company.id,
      razonSocial: company.razonSocial,
      nombreFantasia: company.nombreFantasia ?? null,
      businessActivity: company.businessActivity ?? null,
      rut: company.rut,
      address: company.address?.trim() ? company.address.trim() : null,
      mail: resolveCompanyContactEmail(company),
      phone: resolveCompanyContactPhone(company),
      defaultCurrency: company.defaultCurrency,
      fiscalYearStart: company.fiscalYearStart,
      isActive: company.isActive,
      settings: company.settings || {},
      bankAccounts: company.bankAccounts || [],
    };
  }
}
