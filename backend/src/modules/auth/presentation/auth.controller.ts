import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthServiceAdapter } from '../application/auth.service.adapter';
import { LoginDto } from '../application/dto/login.dto';
import { LoginResponseDto } from '../application/dto/login-response.dto';
import { LogoutDto } from '../application/dto/logout.dto';
import { LogoutResponseDto } from '../application/dto/logout-response.dto';
import { Company } from '@modules/companies/domain/company.entity';
import { UserRole } from '@modules/users/domain/user.entity';
import { MembershipsService } from '@modules/users/application/memberships.service';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentUser,
  CurrentUserPayload,
  SkipTenant,
} from '@common/tenant';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthServiceAdapter,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly membershipsService: MembershipsService,
  ) {}

  @SkipTenant()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with username and password',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid credentials' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['userName should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-active-company-id') companyHint?: string,
    @Headers('x-kai-app') kaiApp?: string,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, {
      companyHint: companyHint && isUUID(companyHint) ? companyHint : null,
      kaiApp: kaiApp?.trim() || null,
    });
  }

  @SkipTenant()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate session',
  })
  @ApiBody({
    type: LogoutDto,
    description: 'Logout request',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(logoutDto);
  }

  /**
   * Lista las empresas disponibles según memberships del usuario.
   * SUPER_ADMIN: todas las activas.
   */
  @Get('companies')
  @AllowAdminWithoutCompany()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Empresas disponibles para el usuario',
    description:
      'Memberships del usuario. SUPER_ADMIN: todas las empresas activas.',
  })
  async companies(@CurrentUser() user: CurrentUserPayload) {
    if (user.rol === UserRole.SUPER_ADMIN) {
      const all = await this.companyRepository.find({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      return {
        success: true,
        companies: all.map((c) => ({
          id: c.id,
          razonSocial: c.razonSocial,
          nombreFantasia: c.nombreFantasia ?? null,
        })),
      };
    }

    const memberships =
      user.memberships?.length
        ? user.memberships
        : await this.membershipsService.getMemberships(user.id);
    if (!memberships.length) {
      return { success: true, companies: [] };
    }
    const ids = memberships.map((m) => m.companyId);
    const rows = await this.companyRepository
      .createQueryBuilder('c')
      .where('c.id IN (:...ids)', { ids })
      .andWhere('c.isActive = true')
      .orderBy('c.createdAt', 'ASC')
      .getMany();
    return {
      success: true,
      companies: rows.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        nombreFantasia: c.nombreFantasia ?? null,
      })),
      memberships,
    };
  }

  /**
   * Cambia la empresa activa (SUPER_ADMIN o usuario con membership).
   * Body: { companyId } o { multiCompanyMode: true }.
   */
  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  @AdminOnly()
  @AllowAdminWithoutCompany()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cambiar empresa activa o entrar a Multiempresa',
  })
  async switchCompany(
    @Body() body: { companyId?: string; multiCompanyMode?: boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (body?.multiCompanyMode) {
      const can =
        user.rol === UserRole.SUPER_ADMIN ||
        (await this.membershipsService.canUseMultiCompanyMode(user.id));
      if (!can) {
        throw new ForbiddenException(
          'Este usuario no puede usar el modo Multiempresa',
        );
      }
      return {
        success: true,
        activeCompanyId: null,
        multiCompanyMode: true,
      };
    }

    const id = String(body?.companyId || '').trim();
    if (!isUUID(id)) {
      throw new BadRequestException('companyId inválido');
    }
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }
    if (!company.isActive) {
      throw new BadRequestException('La empresa está inactiva');
    }

    if (user.rol !== UserRole.SUPER_ADMIN) {
      const mem = await this.membershipsService.getMembership(user.id, id);
      if (!mem) {
        throw new ForbiddenException(
          'No tienes membership en esa empresa',
        );
      }
    }

    return {
      success: true,
      activeCompanyId: company.id,
      multiCompanyMode: false,
      company: {
        id: company.id,
        razonSocial: company.razonSocial,
        nombreFantasia: company.nombreFantasia ?? null,
      },
    };
  }
}
