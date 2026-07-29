import type { DataSource } from 'typeorm';
import { LaundryGarmentType } from '@modules/laundry/domain/laundry-garment-type.entity';
import { LaundryGarmentAttribute } from '@modules/laundry/domain/laundry-garment-attribute.entity';
import { LaundryGarmentAttributeValue } from '@modules/laundry/domain/laundry-garment-attribute-value.entity';
import { LaundryCareTemplate } from '@modules/laundry/domain/laundry-care-template.entity';

/** Tipos de prenda para operar guías de recepción en POS. */
export const SEED_DEMO_LAUNDRY_GARMENT_TYPES = [
  { code: 'CAMISA', name: 'Camisa', sortOrder: 0 },
  { code: 'PANTALON', name: 'Pantalón', sortOrder: 1 },
  { code: 'SABANA', name: 'Sábana', sortOrder: 2 },
  { code: 'TOALLA', name: 'Toalla', sortOrder: 3 },
  { code: 'VESTIDO', name: 'Vestido', sortOrder: 4 },
  { code: 'CHAQUETA', name: 'Chaqueta', sortOrder: 5 },
] as const;

export const SEED_DEMO_LAUNDRY_ATTRIBUTES = [
  {
    code: 'COLOR',
    name: 'Color',
    sortOrder: 0,
    values: ['Blanco', 'Negro', 'Azul', 'Rojo', 'Gris', 'Beige'] as const,
  },
  {
    code: 'TALLA',
    name: 'Talla',
    sortOrder: 1,
    values: ['XS', 'S', 'M', 'L', 'XL', 'Única'] as const,
  },
  {
    code: 'CALIDAD',
    name: 'Calidad',
    sortOrder: 2,
    values: [
      '★ Muy gastada',
      '★★ Regular',
      '★★★ Buena',
      '★★★★ Muy buena',
      '★★★★★ Como nueva',
    ] as const,
  },
] as const;

export const SEED_DEMO_LAUNDRY_CARE_TEMPLATES = [
  {
    label: 'Agua fría',
    text: 'Lavar con agua fría.',
    sortOrder: 0,
  },
  {
    label: 'No secar en máquina',
    text: 'No usar secadora; secar al aire.',
    sortOrder: 1,
  },
  {
    label: 'Solo planchar',
    text: 'Solo planchado; no lavar.',
    sortOrder: 2,
  },
  {
    label: 'Delicado',
    text: 'Tratamiento delicado / prenda sensible.',
    sortOrder: 3,
  },
  {
    label: 'Sin perfume',
    text: 'Sin suavizante ni perfume.',
    sortOrder: 4,
  },
] as const;

/**
 * Sincroniza catálogo operativo de lavandería (tipos, atributos, plantillas).
 * Idempotente por `code` / `label` dentro de la empresa.
 */
export async function seedDemoLaundryCatalog(
  dataSource: DataSource,
  companyId: string,
): Promise<void> {
  const typeRepo = dataSource.getRepository(LaundryGarmentType);
  const attrRepo = dataSource.getRepository(LaundryGarmentAttribute);
  const valueRepo = dataSource.getRepository(LaundryGarmentAttributeValue);
  const careRepo = dataSource.getRepository(LaundryCareTemplate);

  for (const row of SEED_DEMO_LAUNDRY_GARMENT_TYPES) {
    const existing = await typeRepo.findOne({
      where: { companyId, code: row.code },
    });
    if (existing) {
      existing.name = row.name;
      existing.active = true;
      existing.sortOrder = row.sortOrder;
      await typeRepo.save(existing);
    } else {
      await typeRepo.save(
        typeRepo.create({
          companyId,
          code: row.code,
          name: row.name,
          active: true,
          sortOrder: row.sortOrder,
        }),
      );
    }
  }

  for (const attrDef of SEED_DEMO_LAUNDRY_ATTRIBUTES) {
    let attr = await attrRepo.findOne({
      where: { companyId, code: attrDef.code },
    });
    if (attr) {
      attr.name = attrDef.name;
      attr.active = true;
      attr.sortOrder = attrDef.sortOrder;
      attr = await attrRepo.save(attr);
    } else {
      attr = await attrRepo.save(
        attrRepo.create({
          companyId,
          code: attrDef.code,
          name: attrDef.name,
          active: true,
          sortOrder: attrDef.sortOrder,
        }),
      );
    }

    for (let i = 0; i < attrDef.values.length; i++) {
      const label = attrDef.values[i];
      const existingValue = await valueRepo.findOne({
        where: { attributeId: attr.id, label },
      });
      if (existingValue) {
        existingValue.active = true;
        existingValue.sortOrder = i;
        await valueRepo.save(existingValue);
      } else {
        await valueRepo.save(
          valueRepo.create({
            attributeId: attr.id,
            label,
            active: true,
            sortOrder: i,
          }),
        );
      }
    }
  }

  for (const care of SEED_DEMO_LAUNDRY_CARE_TEMPLATES) {
    const existing = await careRepo.findOne({
      where: { companyId, label: care.label },
    });
    if (existing) {
      existing.text = care.text;
      existing.active = true;
      existing.sortOrder = care.sortOrder;
      await careRepo.save(existing);
    } else {
      await careRepo.save(
        careRepo.create({
          companyId,
          label: care.label,
          text: care.text,
          active: true,
          sortOrder: care.sortOrder,
        }),
      );
    }
  }

  console.log(
    `✅ Lavandería catálogo: ${SEED_DEMO_LAUNDRY_GARMENT_TYPES.length} tipo(s), ` +
      `${SEED_DEMO_LAUNDRY_ATTRIBUTES.length} atributo(s), ` +
      `${SEED_DEMO_LAUNDRY_CARE_TEMPLATES.length} plantilla(s) de cuidado`,
  );
}
