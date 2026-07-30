import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '@common/tenant/tenant.context';
import { LaundryGarmentType } from '../domain/laundry-garment-type.entity';
import { LaundryGarmentAttribute } from '../domain/laundry-garment-attribute.entity';
import { LaundryGarmentAttributeValue } from '../domain/laundry-garment-attribute-value.entity';
import { LaundryCareTemplate } from '../domain/laundry-care-template.entity';
import { LaundryReceptionGarment } from '../domain/laundry-reception-garment.entity';
import {
  UpdateAttributeValueDto,
  UpdateCareTemplateDto,
  UpdateGarmentAttributeDto,
  UpdateGarmentTypeDto,
  UpsertAttributeValueDto,
  UpsertCareTemplateDto,
  UpsertGarmentAttributeDto,
  UpsertGarmentTypeDto,
} from './dto/laundry-catalog.dtos';

@Injectable()
export class LaundryCatalogService {
  constructor(
    @InjectRepository(LaundryGarmentType)
    private readonly garmentTypeRepo: Repository<LaundryGarmentType>,
    @InjectRepository(LaundryGarmentAttribute)
    private readonly attributeRepo: Repository<LaundryGarmentAttribute>,
    @InjectRepository(LaundryGarmentAttributeValue)
    private readonly attributeValueRepo: Repository<LaundryGarmentAttributeValue>,
    @InjectRepository(LaundryCareTemplate)
    private readonly careTemplateRepo: Repository<LaundryCareTemplate>,
    @InjectRepository(LaundryReceptionGarment)
    private readonly receptionGarmentRepo: Repository<LaundryReceptionGarment>,
  ) {}

  private requireCompanyId(): string {
    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException('No hay empresa activa en el contexto.');
    }
    return companyId;
  }

  // --- Garment types ---

  async listGarmentTypes(includeInactive = false): Promise<LaundryGarmentType[]> {
    const companyId = this.requireCompanyId();
    const qb = this.garmentTypeRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.name', 'ASC');
    if (!includeInactive) {
      qb.andWhere('t.active = :active', { active: true });
    }
    return qb.getMany();
  }

  async createGarmentType(dto: UpsertGarmentTypeDto): Promise<LaundryGarmentType> {
    const companyId = this.requireCompanyId();
    const code = dto.code.trim();
    const name = dto.name.trim();
    if (!code || !name) {
      throw new BadRequestException('Código y nombre son obligatorios.');
    }
    const dup = await this.garmentTypeRepo.findOne({ where: { companyId, code } });
    if (dup) {
      throw new ConflictException(`Ya existe un tipo de prenda con código «${code}».`);
    }
    const row = this.garmentTypeRepo.create({
      companyId,
      code,
      name,
      active: dto.active !== false,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.garmentTypeRepo.save(row);
  }

  async updateGarmentType(
    id: string,
    dto: UpdateGarmentTypeDto,
  ): Promise<LaundryGarmentType> {
    const companyId = this.requireCompanyId();
    const existing = await this.garmentTypeRepo.findOne({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Tipo de prenda no encontrado.');
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException('El código es obligatorio.');
      const dup = await this.garmentTypeRepo.findOne({ where: { companyId, code } });
      if (dup && dup.id !== id) {
        throw new ConflictException(`Ya existe un tipo de prenda con código «${code}».`);
      }
      existing.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('El nombre es obligatorio.');
      existing.name = name;
    }
    if (dto.active !== undefined) existing.active = dto.active;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    return this.garmentTypeRepo.save(existing);
  }

  async removeGarmentType(id: string): Promise<void> {
    const companyId = this.requireCompanyId();
    const existing = await this.garmentTypeRepo.findOne({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Tipo de prenda no encontrado.');
    const inUse = await this.receptionGarmentRepo.exist({
      where: { garmentTypeId: id },
    });
    if (inUse) {
      existing.active = false;
      await this.garmentTypeRepo.save(existing);
      return;
    }
    await this.garmentTypeRepo.remove(existing);
  }

  // --- Garment attributes ---

  async listGarmentAttributes(includeInactive = false): Promise<LaundryGarmentAttribute[]> {
    const companyId = this.requireCompanyId();
    const qb = this.attributeRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.values', 'v')
      .where('a.companyId = :companyId', { companyId })
      .orderBy('a.sortOrder', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .addOrderBy('v.sortOrder', 'ASC');
    if (!includeInactive) {
      qb.andWhere('a.active = :active', { active: true });
    }
    return qb.getMany();
  }

  async createGarmentAttribute(
    dto: UpsertGarmentAttributeDto,
  ): Promise<LaundryGarmentAttribute> {
    const companyId = this.requireCompanyId();
    const code = dto.code.trim();
    const name = dto.name.trim();
    if (!code || !name) {
      throw new BadRequestException('Código y nombre son obligatorios.');
    }
    const dup = await this.attributeRepo.findOne({ where: { companyId, code } });
    if (dup) {
      throw new ConflictException(`Ya existe un atributo con código «${code}».`);
    }
    const row = this.attributeRepo.create({
      companyId,
      code,
      name,
      active: dto.active !== false,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.attributeRepo.save(row);
  }

  async updateGarmentAttribute(
    id: string,
    dto: UpdateGarmentAttributeDto,
  ): Promise<LaundryGarmentAttribute> {
    const companyId = this.requireCompanyId();
    const existing = await this.attributeRepo.findOne({
      where: { id, companyId },
      relations: ['values'],
    });
    if (!existing) throw new NotFoundException('Atributo no encontrado.');
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new BadRequestException('El código es obligatorio.');
      const dup = await this.attributeRepo.findOne({ where: { companyId, code } });
      if (dup && dup.id !== id) {
        throw new ConflictException(`Ya existe un atributo con código «${code}».`);
      }
      existing.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('El nombre es obligatorio.');
      existing.name = name;
    }
    if (dto.active !== undefined) existing.active = dto.active;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    return this.attributeRepo.save(existing);
  }

  async removeGarmentAttribute(id: string): Promise<void> {
    const companyId = this.requireCompanyId();
    const existing = await this.attributeRepo.findOne({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Atributo no encontrado.');
    existing.active = false;
    await this.attributeRepo.save(existing);
  }

  // --- Attribute values ---

  async createAttributeValue(
    attributeId: string,
    dto: UpsertAttributeValueDto,
  ): Promise<LaundryGarmentAttributeValue> {
    const companyId = this.requireCompanyId();
    const attribute = await this.attributeRepo.findOne({
      where: { id: attributeId, companyId },
    });
    if (!attribute) throw new NotFoundException('Atributo no encontrado.');
    const label = dto.label.trim();
    if (!label) throw new BadRequestException('La etiqueta es obligatoria.');
    const row = this.attributeValueRepo.create({
      attributeId,
      label,
      active: dto.active !== false,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.attributeValueRepo.save(row);
  }

  async updateAttributeValue(
    attributeId: string,
    valueId: string,
    dto: UpdateAttributeValueDto,
  ): Promise<LaundryGarmentAttributeValue> {
    const companyId = this.requireCompanyId();
    const attribute = await this.attributeRepo.findOne({
      where: { id: attributeId, companyId },
    });
    if (!attribute) throw new NotFoundException('Atributo no encontrado.');
    const existing = await this.attributeValueRepo.findOne({
      where: { id: valueId, attributeId },
    });
    if (!existing) throw new NotFoundException('Valor de atributo no encontrado.');
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('La etiqueta es obligatoria.');
      existing.label = label;
    }
    if (dto.active !== undefined) existing.active = dto.active;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    return this.attributeValueRepo.save(existing);
  }

  async removeAttributeValue(attributeId: string, valueId: string): Promise<void> {
    const companyId = this.requireCompanyId();
    const attribute = await this.attributeRepo.findOne({
      where: { id: attributeId, companyId },
    });
    if (!attribute) throw new NotFoundException('Atributo no encontrado.');
    const existing = await this.attributeValueRepo.findOne({
      where: { id: valueId, attributeId },
    });
    if (!existing) throw new NotFoundException('Valor de atributo no encontrado.');
    existing.active = false;
    await this.attributeValueRepo.save(existing);
  }

  // --- Care templates ---

  async listCareTemplates(includeInactive = false): Promise<LaundryCareTemplate[]> {
    const companyId = this.requireCompanyId();
    const qb = this.careTemplateRepo
      .createQueryBuilder('c')
      .where('c.companyId = :companyId', { companyId })
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.label', 'ASC');
    if (!includeInactive) {
      qb.andWhere('c.active = :active', { active: true });
    }
    return qb.getMany();
  }

  async createCareTemplate(dto: UpsertCareTemplateDto): Promise<LaundryCareTemplate> {
    const companyId = this.requireCompanyId();
    const label = dto.label.trim();
    const text = dto.text.trim();
    if (!label || !text) {
      throw new BadRequestException('Etiqueta y texto son obligatorios.');
    }
    const row = this.careTemplateRepo.create({
      companyId,
      label,
      text,
      active: dto.active !== false,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.careTemplateRepo.save(row);
  }

  async updateCareTemplate(
    id: string,
    dto: UpdateCareTemplateDto,
  ): Promise<LaundryCareTemplate> {
    const companyId = this.requireCompanyId();
    const existing = await this.careTemplateRepo.findOne({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Plantilla de cuidado no encontrada.');
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('La etiqueta es obligatoria.');
      existing.label = label;
    }
    if (dto.text !== undefined) {
      const text = dto.text.trim();
      if (!text) throw new BadRequestException('El texto es obligatorio.');
      existing.text = text;
    }
    if (dto.active !== undefined) existing.active = dto.active;
    if (dto.sortOrder !== undefined) existing.sortOrder = dto.sortOrder;
    return this.careTemplateRepo.save(existing);
  }

  async removeCareTemplate(id: string): Promise<void> {
    const companyId = this.requireCompanyId();
    const existing = await this.careTemplateRepo.findOne({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Plantilla de cuidado no encontrada.');
    existing.active = false;
    await this.careTemplateRepo.save(existing);
  }
}
