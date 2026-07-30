import { SuppliersService } from '../../application/suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  const repoMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(() => {
    service = new SuppliersService(repoMock as any);
  });

  it('calls repository findAll', async () => {
    repoMock.findAll.mockResolvedValue([]);
    const res = await service.findAll();
    expect(repoMock.findAll).toHaveBeenCalled();
  });
});
