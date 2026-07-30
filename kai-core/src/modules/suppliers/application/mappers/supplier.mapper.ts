import { Supplier } from '../../domain/supplier.entity';
import { SupplierOrmEntity } from '../../infrastructure/orm-mappers/supplier.orm-entity';

export const SupplierMapper = {
  toDomain(orm?: SupplierOrmEntity | null): Supplier | null {
    if (!orm) return null;
    const d = new Supplier();
    d.id = orm.id;
    d.personId = orm.personId;
    d.supplierType = orm.supplierType as any;
    d.alias = orm.alias;
    d.defaultPaymentTermDays = orm.defaultPaymentTermDays;
    d.isActive = orm.isActive;
    d.notes = orm.notes;
    d.createdAt = orm.createdAt;
    d.updatedAt = orm.updatedAt;
    d.deletedAt = orm.deletedAt;
    return d;
  },

  toOrm(domain: Supplier): Partial<SupplierOrmEntity> {
    return {
      id: domain.id,
      personId: domain.personId,
      supplierType: domain.supplierType as any,
      alias: domain.alias,
      defaultPaymentTermDays: domain.defaultPaymentTermDays,
      isActive: domain.isActive,
      notes: domain.notes,
    };
  },
};
