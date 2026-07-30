import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentUser,
  CurrentUserPayload,
  OptionalCurrentCompany,
  SuperAdminOnly,
} from '@common/tenant';
import { UsersService } from '../application/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ChangeOwnPasswordDto,
} from '../application/dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Lista los usuarios visibles según el contexto:
   * - Por defecto se filtra a la empresa activa (ADMIN/OPERATOR no ven
   *   usuarios de otras empresas; SUPER_ADMIN ve los de la empresa
   *   activa seleccionada).
   * - Excluye SUPER_ADMINs (se gestionan en su propio endpoint).
   */
  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Get all users for the active company' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getUsers(
    @Query('search') search?: string,
    @OptionalCurrentCompany() activeCompanyId?: string | null,
  ) {
    return this.usersService.getAllUsers(search, activeCompanyId);
  }

  /**
   * Lista a todos los super-administradores del deploy (rol SUPER_ADMIN).
   * No requiere empresa activa: son globales.
   */
  @Get('super-admins')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  @ApiOperation({ summary: 'List global super-admins (SUPER_ADMIN only)' })
  async getSuperAdmins() {
    const items = await this.usersService.listSuperAdmins();
    return { success: true, items };
  }

  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      return { success: false, message: 'User not found', statusCode: 404 };
    }
    return user;
  }

  @Post()
  @AdminOnly()
  @AllowAdminWithoutCompany()
  @ApiOperation({ summary: 'Create new user' })
  @ApiBody({ type: CreateUserDto })
  async createUser(
    @Body() data: CreateUserDto,
    @OptionalCurrentCompany() activeCompanyId?: string | null,
    @CurrentUser() currentUser?: CurrentUserPayload,
  ) {
    return this.usersService.createUser(
      {
        userName: data.userName,
        mail: data.mail,
        password: data.password,
        rol: data.rol,
        companyId: data.companyId ?? null,
        personId: data.personId,
        person: data.person,
        alsoAsEmployee: data.alsoAsEmployee,
        memberships: data.memberships,
      },
      activeCompanyId,
      currentUser,
    );
  }

  @Put(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID to update' })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.usersService.updateUser(id, data, currentUser);
  }

  @Post('transfer-ownership')
  @AdminOnly()
  @ApiOperation({ summary: 'Transfer company ownership to another ADMIN' })
  async transferOwnership(
    @Body() body: { companyId: string; toUserId: string },
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.usersService.transferOwnership(
      body.companyId,
      body.toUserId,
      currentUser,
    );
  }

  @Delete(':id')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID to delete' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.usersService.deleteUser(id, currentUser);
  }

  @Put(':id/password')
  @AdminOnly()
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Param('id') id: string,
    @Body() data: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, data.password);
  }

  @Put('password')
  @ApiOperation({ summary: 'Change own password' })
  @ApiBody({ type: ChangeOwnPasswordDto })
  async changeOwnPassword(@Body() data: ChangeOwnPasswordDto) {
    return this.usersService.changeOwnPassword(data);
  }
}
