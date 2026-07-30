import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { User } from './domain/user.entity';
import { UserCompanyMembership } from './domain/user-company-membership.entity';
import { UserCompanyRole } from './domain/user-company-role.entity';
import { UserCompanyPerson } from './domain/user-company-person.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { PersonsModule } from '@modules/persons/persons.module';
import { UsersService } from './application/users.service';
import { MembershipsService } from './application/memberships.service';
import { UsersServiceAdapter } from './application/users.service.adapter';
import { UsersController } from './presentation/users.controller';

// CQRS Imports
import { CreateUserCommandHandler } from './application/handlers/commands/create-user.handler';
import { UpdateUserCommandHandler } from './application/handlers/commands/update-user.handler';
import { RemoveUserCommandHandler } from './application/handlers/commands/remove-user.handler';
import { ChangeUserPasswordCommandHandler } from './application/handlers/commands/change-user-password.handler';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { UsersSchemaBootstrap } from './infrastructure/users-schema.bootstrap';

import { GetAllUsersQueryHandler } from './application/handlers/queries/get-all-users.handler';
import { GetUserQueryHandler } from './application/handlers/queries/get-user.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCompanyMembership,
      UserCompanyRole,
      UserCompanyPerson,
      Person,
      Employee,
    ]),
    CqrsModule,
    PersonsModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    MembershipsService,
    UsersServiceAdapter,
    CreateUserCommandHandler,
    UpdateUserCommandHandler,
    RemoveUserCommandHandler,
    ChangeUserPasswordCommandHandler,
    GetAllUsersQueryHandler,
    GetUserQueryHandler,
    UsersSchemaBootstrap,
    {
      provide: 'UserRepositoryPort',
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [
    UsersService,
    MembershipsService,
    UsersServiceAdapter,
    {
      provide: 'UserRepositoryPort',
      useClass: TypeOrmUserRepository,
    },
  ],
})
export class UsersModule {}
