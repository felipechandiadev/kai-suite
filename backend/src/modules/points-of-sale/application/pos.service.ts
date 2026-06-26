import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, IsNull } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import {
  Storage,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { TenantContext } from '@common/tenant/tenant.context';
import {
  EffectivePaymentMethod,
  PosPaymentMethodConfig,
  buildDefaultPosList,
  mergeCompanyAndPos,
  syncPosPaymentMethodsWithCatalog,
  validatePosPaymentMethods,
} from '@modules/payment-methods-config';
import {
  readAcceptsPresaleTickets,
  readPosKind,
  sanitizePosSettingsPatch,
  type PosKind,
  type PosSettings,
} from '../domain/pos-settings.types';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PointOfSale)
    private posRepository: Repository<PointOfSale>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    private readonly companiesService: CompaniesService,
  ) {}

  async findAll(includeInactive: boolean) {
    const query = this.posRepository
      .createQueryBuilder('pos')
      .leftJoinAndSelect('pos.branch', 'branch')
      .leftJoinAndSelect('pos.storage', 'storage')
      .where('pos.deletedAt IS NULL')
      .orderBy('pos.name', 'ASC');

    if (!includeInactive) {
      query.andWhere('pos.isActive = :isActive', { isActive: true });
    }

    const pointsOfSale = await query.getMany();

    return {
      success: true,
      pointsOfSale: pointsOfSale.map((pos) => this.mapPointOfSale(pos)),
    };
  }

  async getPointOfSaleById(id: string) {
    const pos = await this.posRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { branch: true, storage: true },
    });
    if (!pos) {
      return null;
    }
    return this.mapPointOfSale(pos);
  }

  async createPointOfSale(data: {
    name: string;
    branchId: string;
    storageId: string;
    deviceId?: string | null;
    isActive?: boolean;
    priceLists?: Array<{ id: string; name: string; isActive: boolean }>;
    defaultPriceListId?: string | null;
    kind?: PosKind;
    acceptsPresaleTickets?: boolean;
  }) {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }
    if (!data.branchId?.trim()) {
      return { success: false, error: 'La sucursal es requerida' };
    }
    if (!data.storageId?.trim()) {
      return {
        success: false,
        error: 'Debe elegir la sala de venta (almacén tipo sala) para stock POS',
      };
    }
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      return { success: false, error: 'No hay empresa activa en el contexto' };
    }
    const storageErr = await this.validatePosStoreStorage(
      companyId,
      data.branchId.trim(),
      data.storageId.trim(),
    );
    if (storageErr) {
      return { success: false, error: storageErr };
    }

    const priceLists = Array.isArray(data.priceLists) ? data.priceLists : [];
    const defaultPriceListId =
      data.defaultPriceListId ??
      (priceLists.length > 0 ? priceLists[0].id : undefined);

    const settings = sanitizePosSettingsPatch(null, {
      kind: data.kind,
      acceptsPresaleTickets: data.acceptsPresaleTickets,
    });

    const pos = this.posRepository.create({
      name: data.name.trim(),
      branchId: data.branchId.trim(),
      storageId: data.storageId.trim(),
      deviceId: data.deviceId ?? undefined,
      isActive: data.isActive !== false,
      priceLists,
      defaultPriceListId,
      settings,
    } as DeepPartial<PointOfSale>);

    const saved = await this.posRepository.save(pos);
    const created = await this.getPointOfSaleById(saved.id);

    return { success: true, pointOfSale: created };
  }

  async updatePointOfSale(
    id: string,
    data: Partial<{
      name: string;
      branchId: string | null;
      deviceId: string | null;
      isActive: boolean;
      priceLists: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId: string | null;
      storageId: string | null;
      kind?: PosKind;
      acceptsPresaleTickets?: boolean;
    }>,
  ) {
    const pos = await this.posRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!pos) {
      return { success: false, error: 'Punto de venta no encontrado' };
    }

    const updateData: Partial<PointOfSale> = {};
    if (typeof data.name === 'string') {
      updateData.name = data.name.trim();
    }
    if (data.branchId !== undefined) {
      updateData.branchId = data.branchId ?? undefined;
    }
    if (data.deviceId !== undefined) {
      updateData.deviceId = data.deviceId ?? undefined;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.priceLists !== undefined) {
      updateData.priceLists = data.priceLists;
    }
    if (data.defaultPriceListId !== undefined) {
      updateData.defaultPriceListId = data.defaultPriceListId ?? undefined;
    }

    const nextBranchId =
      data.branchId !== undefined ? data.branchId ?? pos.branchId : pos.branchId;
    if (data.storageId !== undefined) {
      const sid =
        typeof data.storageId === 'string' && data.storageId.trim()
          ? data.storageId.trim()
          : null;
      if (!sid) {
        return {
          success: false,
          error:
            'El almacén sala de venta es obligatorio; no se puede dejar vacío.',
        };
      }
      const branchForStorage = (nextBranchId ?? '').toString().trim();
      if (!branchForStorage) {
        return {
          success: false,
          error: 'Asigne sucursal al POS antes de fijar la sala de venta.',
        };
      }
      const companyId = pos.companyId;
      const storageErr = await this.validatePosStoreStorage(
        companyId,
        branchForStorage,
        sid,
      );
      if (storageErr) {
        return { success: false, error: storageErr };
      }
      updateData.storageId = sid;
    } else if (data.branchId !== undefined && data.branchId && pos.storageId) {
      const storageErr = await this.validatePosStoreStorage(
        pos.companyId,
        data.branchId,
        pos.storageId,
      );
      if (storageErr) {
        return {
          success: false,
          error:
            'La sala de venta actual no pertenece a la nueva sucursal; elija otra.',
        };
      }
    }

    if (data.kind !== undefined || data.acceptsPresaleTickets !== undefined) {
      const nextSettings = sanitizePosSettingsPatch(
        (pos.settings ?? {}) as PosSettings,
        {
          kind: data.kind,
          acceptsPresaleTickets: data.acceptsPresaleTickets,
        },
      );
      updateData.settings = nextSettings;
    }

    await this.posRepository.update(id, updateData);
    const updated = await this.getPointOfSaleById(id);

    return { success: true, pointOfSale: updated };
  }

  async getPriceLists(id: string) {
    const pos = await this.posRepository.findOne({ where: { id } });
    if (!pos) {
      return {
        success: false,
        message: 'Punto de venta no encontrado',
        priceLists: [],
      };
    }
    return {
      success: true,
      priceLists: pos.priceLists ?? [],
    };
  }

  async deletePointOfSale(id: string) {
    const result = await this.posRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, error: 'Punto de venta no encontrado' };
    }
    return { success: true };
  }

  /** Lee la lista cruda de POS (config local). Si no hay, devuelve default
   * a partir del catálogo de empresa. */
  async getPaymentMethods(posId: string): Promise<PosPaymentMethodConfig[]> {
    const pos = await this.posRepository.findOne({
      where: { id: posId, deletedAt: IsNull() },
    });
    if (!pos) throw new NotFoundException('Punto de venta no encontrado');
    const catalog = await this.companiesService.getPaymentMethods(pos.companyId);
    const raw = pos.settings?.paymentMethods;
    if (!Array.isArray(raw) || raw.length === 0) {
      return buildDefaultPosList(catalog);
    }
    try {
      const validated = validatePosPaymentMethods(raw, catalog);
      return syncPosPaymentMethodsWithCatalog(catalog, validated);
    } catch {
      return buildDefaultPosList(catalog);
    }
  }

  async replacePaymentMethods(
    posId: string,
    list: unknown,
  ): Promise<PosPaymentMethodConfig[]> {
    const pos = await this.posRepository.findOne({
      where: { id: posId, deletedAt: IsNull() },
    });
    if (!pos) throw new NotFoundException('Punto de venta no encontrado');
    const catalog = await this.companiesService.getPaymentMethods(pos.companyId);
    let validated: PosPaymentMethodConfig[];
    try {
      const incoming = Array.isArray(list) ? list : [];
      const synced = syncPosPaymentMethodsWithCatalog(catalog, incoming);
      validated = validatePosPaymentMethods(synced, catalog);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Configuración inválida',
      );
    }
    pos.settings = { ...(pos.settings ?? {}), paymentMethods: validated };
    await this.posRepository.save(pos);
    return validated;
  }

  /**
   * Devuelve la vista efectiva (merge company+POS) lista para pwa-pos.
   */
  async getEffectivePaymentMethods(
    posId: string,
  ): Promise<EffectivePaymentMethod[]> {
    const pos = await this.posRepository.findOne({
      where: { id: posId, deletedAt: IsNull() },
    });
    if (!pos) throw new NotFoundException('Punto de venta no encontrado');
    const catalog = await this.companiesService.getPaymentMethods(pos.companyId);
    const list = await this.getPaymentMethods(posId);
    return mergeCompanyAndPos(catalog, list);
  }

  private mapPointOfSale(pos: PointOfSale) {
    return {
      id: pos.id,
      companyId: pos.companyId,
      name: pos.name,
      branchId: pos.branchId,
      branch: pos.branch
        ? {
            id: pos.branch.id,
            name: pos.branch.name,
          }
        : undefined,
      storageId: pos.storageId ?? null,
      storage: pos.storage
        ? {
            id: pos.storage.id,
            name: pos.storage.name,
            type: pos.storage.type,
          }
        : undefined,
      priceLists: pos.priceLists ?? [],
      deviceId: pos.deviceId,
      isActive: pos.isActive,
      defaultPriceListId: pos.defaultPriceListId ?? null,
      kind: readPosKind(pos.settings),
      acceptsPresaleTickets: readAcceptsPresaleTickets(pos.settings),
      createdAt: pos.createdAt,
      updatedAt: pos.updatedAt,
    };
  }

  /** Mensaje de error o `null` si el almacén es una sala de venta válida para la sucursal. */
  private async validatePosStoreStorage(
    companyId: string,
    branchId: string,
    storageId: string,
  ): Promise<string | null> {
    const storage = await this.storageRepository.findOne({
      where: { id: storageId, deletedAt: IsNull() },
    });
    if (!storage) {
      return 'Almacén no encontrado';
    }
    if (storage.companyId !== companyId) {
      return 'El almacén no pertenece a la empresa activa';
    }
    if ((storage.branchId ?? null) !== branchId) {
      return 'El almacén debe pertenecer a la misma sucursal que el punto de venta';
    }
    if (storage.type !== StorageType.STORE) {
      return 'El almacén del POS debe ser tipo sala de venta (STORE)';
    }
    if (!storage.isActive) {
      return 'El almacén sala de venta está inactivo';
    }
    return null;
  }
}
