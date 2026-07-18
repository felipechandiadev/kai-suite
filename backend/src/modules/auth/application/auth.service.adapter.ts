import { Injectable, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LoginCommand } from './commands/login.command';
import { LogoutCommand } from './commands/logout.command';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutDto } from './dto/logout.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';

@Injectable()
export class AuthServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async login(
    loginDto: LoginDto,
    options?: { companyHint?: string | null; kaiApp?: string | null },
  ): Promise<LoginResponseDto> {
    const command = new LoginCommand(
      loginDto.userName,
      loginDto.password,
      options?.companyHint ?? null,
      !!loginDto.multiCompanyMode,
      options?.kaiApp ?? null,
    );
    const result = await this.commandBus.execute(command);

    if (!result.success) {
      throw new Error('Login failed');
    }

    return {
      success: result.success,
      user: result.user,
      activeCompanyId: result.activeCompanyId ?? null,
      multiCompanyMode: result.multiCompanyMode ?? false,
      memberships: result.memberships ?? [],
      companies: result.companies ?? null,
      message: 'Login successful',
    };
  }

  async logout(logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    const command = new LogoutCommand(logoutDto.userId);
    const result = await this.commandBus.execute(command);

    return {
      success: result.success,
      message: 'Logout successful',
    };
  }
}
