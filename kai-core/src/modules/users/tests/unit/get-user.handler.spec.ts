import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetUserQueryHandler } from '@modules/users/application/handlers/queries/get-user.handler';
import { GetUserQuery } from '@modules/users/application/queries/get-user.query';
import { UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';

describe('GetUserQueryHandler', () => {
  let handler: GetUserQueryHandler;
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
        GetUserQueryHandler,
        {
          provide: 'UserRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetUserQueryHandler);
  });

  it('should return user when repository finds it', async () => {
    repository.findById.mockResolvedValueOnce({
      id: 'user-1',
      userName: 'john',
      mail: 'john@example.com',
    } as any);

    const result = await handler.execute(new GetUserQuery('user-1'));

    expect(repository.findById).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({
      id: 'user-1',
      userName: 'john',
      mail: 'john@example.com',
    });
  });

  it('should throw when user does not exist', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(handler.execute(new GetUserQuery('missing'))).rejects.toThrow(
      new NotFoundException('User missing not found'),
    );
  });
});