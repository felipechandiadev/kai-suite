import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@modules/users/users.module';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { AuthServiceAdapter } from './application/auth.service.adapter';
import { AUTH_REPOSITORY } from './application/ports/auth.repository.port';
import { TypeOrmAuthRepository } from './infrastructure/repositories/typeorm-auth.repository';

// CQRS Imports
import { LoginCommandHandler } from './application/handlers/commands/login.handler';
import { LogoutCommandHandler } from './application/handlers/commands/logout.handler';
import { ChangePasswordCommandHandler } from './application/handlers/commands/change-password.handler';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([User, Company]), CqrsModule],
  controllers: [AuthController],
  providers: [
    // Legacy service for backward compatibility
    AuthService,
    // CQRS Service Adapter
    AuthServiceAdapter,
    {
      provide: AUTH_REPOSITORY,
      useClass: TypeOrmAuthRepository,
    },
    // CQRS Handlers
    LoginCommandHandler,
    LogoutCommandHandler,
    ChangePasswordCommandHandler,
  ],
  exports: [AuthService, AuthServiceAdapter, AUTH_REPOSITORY],
})
export class AuthModule {}
