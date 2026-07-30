import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LaundryReceptionCodeService } from '../../application/laundry-reception-code.service';
import { LaundryReception } from '../../domain/laundry-reception.entity';
import { nextPrefixedSequenceCodeFromExisting } from '@shared/codes/prefixed-sequence-code.util';

describe('LaundryReceptionCodeService', () => {
  let service: LaundryReceptionCodeService;

  const mockReceptionRepo = {
    exist: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockManagerRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockDataSource = {
    transaction: jest.fn(async (fn: (manager: { getRepository: () => typeof mockManagerRepo }) => unknown) =>
      fn({ getRepository: () => mockManagerRepo }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReceptionRepo.exist.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaundryReceptionCodeService,
        {
          provide: getRepositoryToken(LaundryReception),
          useValue: mockReceptionRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get(LaundryReceptionCodeService);
  });

  it('generates LV000001 when branch has no prior codes', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

    const code = await service.generateUniqueCode('branch-1');

    expect(code).toBe('LV000001');
    expect(mockDataSource.transaction).toHaveBeenCalled();
  });

  it('generates LV000002 after LV000001', async () => {
    mockQueryBuilder.getRawMany.mockResolvedValueOnce([{ code: 'LV000001' }]);

    const code = await service.generateUniqueCode('branch-1');

    expect(code).toBe('LV000002');
  });

  it('uses shared sequence util consistently', () => {
    expect(
      nextPrefixedSequenceCodeFromExisting('LV', ['LV000001'], 6),
    ).toBe('LV000002');
    expect(nextPrefixedSequenceCodeFromExisting('LV', [], 6)).toBe('LV000001');
  });
});
