import { BadRequestException, ConflictException } from '@nestjs/common';
import { PersonsService } from '../../application/persons.service';
import { TenantContext } from '@common/tenant';
import { normalizePersonDocumentNumber } from '../../application/person-document.util';

describe('normalizePersonDocumentNumber', () => {
  it('strips punctuation and lowercases', () => {
    expect(normalizePersonDocumentNumber('12.345.678-9')).toBe('123456789');
    expect(normalizePersonDocumentNumber(' AB-12 ')).toBe('ab12');
  });
});

describe('PersonsService.findByDocumentNumber', () => {
  const personsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const customersRepository = { findOne: jest.fn() };
  const suppliersRepository = { findOne: jest.fn() };
  const employeesRepository = { findOne: jest.fn() };
  const usersRepository = { createQueryBuilder: jest.fn() };

  const service = new PersonsService(
    personsRepository as any,
    customersRepository as any,
    suppliersRepository as any,
    employeesRepository as any,
    usersRepository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires active company', async () => {
    jest.spyOn(TenantContext, 'getCompanyId').mockReturnValue(null);
    await expect(
      service.findByDocumentNumber({ documentNumber: '123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns found false when no person', async () => {
    jest.spyOn(TenantContext, 'getCompanyId').mockReturnValue('company-1');
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    personsRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findByDocumentNumber({
      documentNumber: '12.345.678-9',
    });
    expect(result).toEqual({ found: false });
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('company_id'),
      expect.objectContaining({ companyId: 'company-1' }),
    );
  });

  it('returns person and roles when found', async () => {
    jest.spyOn(TenantContext, 'getCompanyId').mockReturnValue('company-1');
    const person = {
      id: 'p1',
      type: 'NATURAL',
      firstName: 'Ana',
      lastName: 'Pérez',
      documentType: 'RUT',
      documentNumber: '12.345.678-9',
      companyId: 'company-1',
    };
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(person),
    };
    personsRepository.createQueryBuilder.mockReturnValue(qb);
    customersRepository.findOne.mockResolvedValue({
      id: 'c1',
      isActive: true,
    });
    suppliersRepository.findOne.mockResolvedValue(null);
    employeesRepository.findOne.mockResolvedValue(null);
    usersRepository.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });

    const result = await service.findByDocumentNumber({
      documentNumber: '12345678-9',
    });
    expect(result.found).toBe(true);
    expect(result.person?.id).toBe('p1');
    expect(result.roles?.customer?.id).toBe('c1');
    expect(result.roles?.supplier).toBeNull();
  });
});

describe('PersonsService.assertDocumentNumberAvailable (via create)', () => {
  it('scopes uniqueness to company', async () => {
    jest.spyOn(TenantContext, 'getCompanyId').mockReturnValue('company-a');
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'other' }),
    };
    const personsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new PersonsService(
      personsRepository as any,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn() } as any,
      { createQueryBuilder: jest.fn() } as any,
    );

    await expect(
      service.create({
        firstName: 'Test',
        documentNumber: '11.111.111-1',
        documentType: 'RUT' as any,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('company_id'),
      expect.objectContaining({ companyId: 'company-a' }),
    );
  });
});
