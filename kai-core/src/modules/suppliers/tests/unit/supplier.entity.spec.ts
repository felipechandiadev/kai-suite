import { Supplier, SupplierType } from '../../domain/supplier.entity';

describe('Supplier (domain)', () => {
  it('constructs with properties', () => {
    const s = new Supplier();
    s.id = 'id';
    s.personId = 'p';
    s.supplierType = SupplierType.DISTRIBUTOR;
    s.isActive = true;
    expect(s.id).toBe('id');
    expect(s.personId).toBe('p');
    expect(s.supplierType).toBe(SupplierType.DISTRIBUTOR);
  });
});
