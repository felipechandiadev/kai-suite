import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../domain/brand.entity';
import { Product } from '@modules/products/domain/product.entity';
import { TenantContext } from '@common/tenant/tenant.context';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return companyId;
  }

  async findAll(includeInactive = false): Promise<Brand[]> {
    const companyId = this.requireCompanyId();
    const qb = this.brandRepository
      .createQueryBuilder('b')
      .where('b.companyId = :companyId', { companyId })
      .orderBy('b.name', 'ASC');
    if (!includeInactive) {
      qb.andWhere('b.isActive = :isActive', { isActive: true });
    }
    return qb.getMany();
  }

  /**
   * Lista marcas con conteo de productos activos (no eliminados) de la empresa,
   * con `brand_id` apuntando a cada marca.
   */
  async findAllWithProductCounts(includeInactive = false): Promise<
    Array<{
      id: string;
      companyId: string;
      name: string;
      description: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      productCount: number;
    }>
  > {
    const companyId = this.requireCompanyId();
    const brands = await this.findAll(includeInactive);
    if (brands.length === 0) {
      return [];
    }
    const ids = brands.map((b) => b.id);
    type CountRow = { brandId: string; cnt: string };
    const raw = await this.productRepository
      .createQueryBuilder('p')
      .select('p.brandId', 'brandId')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.deletedAt IS NULL')
      .andWhere('p.companyId = :companyId', { companyId })
      .andWhere('p.brandId IN (:...ids)', { ids })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .groupBy('p.brandId')
      .getRawMany<CountRow>();
    const countMap = new Map<string, number>();
    for (const r of raw) {
      if (r.brandId) {
        countMap.set(r.brandId, Number(r.cnt) || 0);
      }
    }
    return brands.map((b) => ({
      id: b.id,
      companyId: b.companyId,
      name: b.name,
      description: b.description ?? null,
      isActive: b.isActive,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      productCount: countMap.get(b.id) ?? 0,
    }));
  }

  async findOne(id: string): Promise<Brand | null> {
    const companyId = this.requireCompanyId();
    return this.brandRepository.findOne({
      where: { id, companyId },
    });
  }

  /** Valida que la marca exista y pertenezca a la empresa activa. */
  async assertBrandInCurrentCompany(brandId: string): Promise<Brand> {
    const brand = await this.findOne(brandId);
    if (!brand) {
      throw new BadRequestException('Marca no válida o no pertenece a la empresa.');
    }
    return brand;
  }

  async create(data: { name: string; description?: string | null; isActive?: boolean }): Promise<Brand> {
    const companyId = this.requireCompanyId();
    const name = data.name.trim();
    if (!name) {
      throw new BadRequestException('El nombre de la marca es obligatorio.');
    }
    const dup = await this.brandRepository.findOne({
      where: { companyId, name },
    });
    if (dup) {
      throw new ConflictException(`Ya existe una marca con el nombre «${name}».`);
    }
    const row = this.brandRepository.create({
      companyId,
      name,
      description: data.description?.trim() || null,
      isActive: data.isActive !== false,
    });
    return this.brandRepository.save(row);
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string | null; isActive: boolean }>,
  ): Promise<Brand> {
    const companyId = this.requireCompanyId();
    const existing = await this.brandRepository.findOne({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Marca no encontrada.');
    }
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('El nombre de la marca es obligatorio.');
      }
      const dup = await this.brandRepository.findOne({
        where: { companyId, name },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(`Ya existe una marca con el nombre «${name}».`);
      }
      existing.name = name;
    }
    if (data.description !== undefined) {
      existing.description = data.description?.trim() || null;
    }
    if (data.isActive !== undefined) {
      existing.isActive = data.isActive;
    }
    return this.brandRepository.save(existing);
  }

  async remove(id: string): Promise<void> {
    const companyId = this.requireCompanyId();
    const existing = await this.brandRepository.findOne({
      where: { id, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Marca no encontrada.');
    }
    await this.brandRepository.softRemove(existing);
  }
}
