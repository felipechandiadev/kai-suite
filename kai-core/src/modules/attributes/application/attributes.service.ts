import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Attribute } from '../domain/attribute.entity';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
  ) {}

  async getAllAttributes(includeInactive: boolean) {
    const query = this.attributeRepository.createQueryBuilder('attribute');

    if (!includeInactive) {
      query.where('attribute.isActive = :isActive', { isActive: true });
    }

    const attributes = await query
      .orderBy('attribute.displayOrder', 'ASC')
      .addOrderBy('attribute.name', 'ASC')
      .getMany();
    return attributes.map((attribute) => this.mapAttribute(attribute));
  }

  async getAttributeById(id: string) {
    const attribute = await this.attributeRepository.findOne({ where: { id } });
    if (!attribute) {
      return null;
    }
    return this.mapAttribute(attribute);
  }

  /**
   * Normaliza y valida el mapa `attributeId → valor de opción` para variantes.
   * Omite entradas vacías; devuelve `null` si no queda ninguna clave.
   */
  async validateAndNormalizeAttributeValues(
    raw: Record<string, unknown> | null | undefined,
  ): Promise<Record<string, string> | null> {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = typeof k === 'string' ? k.trim() : '';
      if (!key) {
        continue;
      }
      const val = v == null ? '' : String(v).trim();
      if (val === '') {
        continue;
      }
      const attr = await this.getAttributeById(key);
      if (!attr) {
        throw new BadRequestException(`Atributo no válido (${key}).`);
      }
      if (!attr.isActive) {
        throw new BadRequestException(`El atributo «${attr.name}» no está activo.`);
      }
      const options = Array.isArray(attr.options) ? attr.options : [];
      if (!options.includes(val)) {
        throw new BadRequestException(
          `El valor «${val}» no es una opción válida para «${attr.name}».`,
        );
      }
      out[key] = val;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  async createAttribute(data: {
    name: string;
    description?: string | null;
    options: string[];
  }) {
    const attribute = this.attributeRepository.create({
      name: data.name,
      description: data.description ?? undefined,
      options: data.options,
      isActive: true,
    } as DeepPartial<Attribute>);

    const saved = await this.attributeRepository.save(attribute);
    const created = await this.getAttributeById(saved.id);

    return { success: true, attribute: created };
  }

  async updateAttribute(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      options: string[];
      isActive: boolean;
    }>,
  ) {
    await this.attributeRepository.update(id, data as any);
    const updated = await this.getAttributeById(id);

    if (!updated) {
      return {
        success: false,
        message: 'Attribute not found',
        statusCode: 404,
      };
    }

    return { success: true, attribute: updated };
  }

  async deleteAttribute(id: string) {
    const result = await this.attributeRepository.softDelete(id);
    if (!result.affected) {
      return {
        success: false,
        message: 'Attribute not found',
        statusCode: 404,
      };
    }
    return { success: true };
  }

  private mapAttribute(attribute: Attribute) {
    return {
      id: attribute.id,
      name: attribute.name,
      description: attribute.description ?? null,
      options: attribute.options ?? [],
      displayOrder: attribute.displayOrder,
      isActive: attribute.isActive,
      createdAt: attribute.createdAt,
      updatedAt: attribute.updatedAt,
    };
  }
}
