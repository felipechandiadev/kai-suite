import { BadRequestException } from '@nestjs/common';
import { TaxesService } from '../../application/taxes.service';

describe('TaxesService rate validation', () => {
  const taxRepository = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: 'tax-1' })),
    findOne: jest.fn(async () => ({
      id: 'tax-1',
      companyId: 'c1',
      name: 'IVA',
      code: null,
      taxType: 'IVA',
      rate: 19,
      description: null,
      isDefault: false,
      isActive: true,
      nonDeletable: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const service = new TaxesService(taxRepository as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create with rate 0', async () => {
    await expect(
      service.createTax({
        companyId: 'c1',
        name: 'Cero',
        rate: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects update with rate 0', async () => {
    await expect(
      service.updateTax('tax-1', { rate: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts create with positive rate', async () => {
    const result = await service.createTax({
      companyId: 'c1',
      name: 'ILA',
      rate: 10,
    });
    expect(result.success).toBe(true);
    expect(taxRepository.save).toHaveBeenCalled();
  });
});
