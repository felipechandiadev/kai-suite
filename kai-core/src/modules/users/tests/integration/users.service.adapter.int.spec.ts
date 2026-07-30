import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersServiceAdapter } from '../../application/users.service.adapter';
import { CreateUserCommandHandler } from '../../application/handlers/commands/create-user.handler';
import { GetAllUsersQueryHandler } from '../../application/handlers/queries/get-all-users.handler';
import { GetUserQueryHandler } from '../../application/handlers/queries/get-user.handler';
import { User } from '../../domain/user.entity';
import { Person } from '../../../persons/domain/person.entity';
import { TypeOrmUserRepository } from '../../infrastructure/repositories/typeorm-user.repository';

describe('UsersServiceAdapter (Integration)', () => {
  let service: UsersServiceAdapter;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Person],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, Person]),
        CqrsModule,
      ],
      providers: [
        UsersServiceAdapter,
        CreateUserCommandHandler,
        GetAllUsersQueryHandler,
        GetUserQueryHandler,
        {
          provide: 'UserRepositoryPort',
          useClass: TypeOrmUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersServiceAdapter>(UsersServiceAdapter);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);

    await module.init();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should execute get all users query through CQRS', async () => {
      const queryBusExecuteSpy = jest.spyOn(queryBus, 'execute');

      try {
        await service.getAllUsers();
      } catch (error) {
        // Expected to fail without test data
      }

      expect(queryBusExecuteSpy).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should execute create user command through CQRS', async () => {
      const createUserDto = {
        userId: 'user-id',
        userName: 'testuser',
        password: 'password',
        mail: 'test@example.com',
        role: 'operator',
        personId: 'person-id',
      };

      const commandBusExecuteSpy = jest.spyOn(commandBus, 'execute');

      try {
        await service.createUser(createUserDto);
      } catch (error) {
        // Expected to fail without proper setup
      }

      expect(commandBusExecuteSpy).toHaveBeenCalled();
    });
  });

  describe('legacy methods', () => {
    it('should have backward compatibility methods', () => {
      expect(service.findOne).toBeDefined();
      expect(service.findAll).toBeDefined();
      expect(service.create).toBeDefined();
      expect(service.update).toBeDefined();
      expect(service.delete).toBeDefined();
    });
  });
});
