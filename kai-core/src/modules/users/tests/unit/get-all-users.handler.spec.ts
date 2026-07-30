import { Test, TestingModule } from '@nestjs/testing';
import { GetAllUsersQueryHandler } from '@modules/users/application/handlers/queries/get-all-users.handler';
import { GetAllUsersQuery } from '@modules/users/application/queries/get-all-users.query';
import { UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';

describe('GetAllUsersQueryHandler', () => {
  let handler: GetAllUsersQueryHandler;
  let repository: jest.Mocked<UserRepositoryPort>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllUsersQueryHandler,
        {
          provide: 'UserRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAllUsersQueryHandler);
  });

  it('should delegate search and pagination to repository', async () => {
    repository.findAll.mockResolvedValueOnce({ data: [{ id: 'user-1' } as any], total: 1 });

    const result = await handler.execute(new GetAllUsersQuery(25, 10, 'john'));

    expect(repository.findAll).toHaveBeenCalledWith({
      search: 'john',
      limit: 25,
      offset: 10,
    });
    expect(result).toEqual({
      data: [{ id: 'user-1' }],
      total: 1,
    });
  });

  it('should preserve default query values', async () => {
    repository.findAll.mockResolvedValueOnce({ data: [], total: 0 });

    const result = await handler.execute(new GetAllUsersQuery());

    expect(repository.findAll).toHaveBeenCalledWith({
      search: undefined,
      limit: 50,
      offset: 0,
    });
    expect(result).toEqual({ data: [], total: 0 });
  });
});