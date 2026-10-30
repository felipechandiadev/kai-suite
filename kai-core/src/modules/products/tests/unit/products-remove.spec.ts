import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../../application/products.service';
import {
  variantsBlockingDelete,
} from '../../application/helpers/variant-stock-guard.util';

describe('variantsBlockingDelete', () => {
  it('bloquea variantes con stock físico o comprometido', () => {
    const blocking = variantsBlockingDelete([
      { variantId: 'a', physical: 0, committed: 0 },
      { variantId: 'b', physical: 5, committed: 0 },
      { variantId: 'c', physical: 0, committed: 2 },
    ]);
    expect(blocking.map((b) => b.variantId)).toEqual(['b', 'c']);
  });
});

describe('ProductsService.remove', () => {
  function build(opts: { product?: unknown; variants?: unknown[]; levels?: unknown[] }) {
    const softDeleteVariants = jest.fn().mockResolvedValue({ affected: 1 });
    const softDeleteProduct = jest.fn().mockResolvedValue({ affected: 1 });
    const manager: any = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity?.name === 'StockLevel') {
          return { find: jest.fn().mockResolvedValue(opts.levels ?? []) };
        }
        if (entity?.name === 'ProductVariant') return { softDelete: softDeleteVariants };
        return { softDelete: softDeleteProduct };
      }),
    };
    const dataSource: any = {
      manager,
      transaction: jest.fn(async (fn: any) => fn(manager)),
    };
    const productRepo: any = {
      findOne: jest.fn().mockResolvedValue(opts.product === undefined ? { id: 'p1', companyId: 'co' } : opts.product),
    };
    const variantRepo: any = { find: jest.fn().mockResolvedValue(opts.variants ?? [{ id: 'v1', sku: 'SKU-1' }]) };
    const service = new ProductsService(
      productRepo,
      variantRepo,
      {} as any,
      {} as any,
      {} as any,
      dataSource,
      {} as any,
      {} as any,
    );
    return { service, softDeleteVariants, softDeleteProduct };
  }

  it('404 si el producto no existe', async () => {
    const { service } = build({ product: null });
    await expect(service.remove('p1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bloquea con error 400 y detalle si hay existencias', async () => {
    const { service, softDeleteProduct } = build({
      levels: [{ productVariantId: 'v1', physicalStock: 12, committedStock: 0 }],
    });
    await expect(service.remove('p1')).rejects.toThrow(BadRequestException);
    await expect(service.remove('p1')).rejects.toThrow(/SKU-1: 12 en existencias/);
    expect(softDeleteProduct).not.toHaveBeenCalled();
  });

  it('elimina producto y variantes cuando no hay stock', async () => {
    const { service, softDeleteVariants, softDeleteProduct } = build({
      levels: [{ productVariantId: 'v1', physicalStock: 0, committedStock: 0 }],
    });
    await expect(service.remove('p1')).resolves.toEqual({ success: true });
    expect(softDeleteVariants).toHaveBeenCalledWith({ productId: 'p1' });
    expect(softDeleteProduct).toHaveBeenCalledWith('p1');
  });
});
