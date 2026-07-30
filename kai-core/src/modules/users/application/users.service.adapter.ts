import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateUserCommand } from './commands/update-user.command';
import { RemoveUserCommand } from './commands/remove-user.command';
import { ChangeUserPasswordCommand } from './commands/change-user-password.command';
import { GetUserQuery } from './queries/get-user.query';
import { GetAllUsersQuery } from './queries/get-all-users.query';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ChangeOwnPasswordDto,
} from './dto/user.dto';
import * as crypto from 'crypto';

@Injectable()
export class UsersServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async getAllUsers(search?: string) {
    const query = new GetAllUsersQuery(50, 0, search);
    return this.queryBus.execute(query);
  }

  async getUserById(id: string) {
    const query = new GetUserQuery(id);
    return this.queryBus.execute(query);
  }

  async createUser(createUserDto: CreateUserDto) {
    const userId = crypto.randomUUID(); // Generate UUID for user
    const command = new CreateUserCommand(
      userId,
      createUserDto.userName,
      createUserDto.mail,
      createUserDto.password,
      createUserDto.personId,
      createUserDto.rol || 'OPERATOR',
    );
    return this.commandBus.execute(command);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const command = new UpdateUserCommand(
      id,
      'current-user-id', // TODO: Get from context
      updateUserDto.userName,
      updateUserDto.mail,
      updateUserDto.rol,
      updateUserDto.phone,
      updateUserDto.personName,
      updateUserDto.personDni,
    );
    return this.commandBus.execute(command);
  }

  async removeUser(id: string) {
    const command = new RemoveUserCommand(
      id,
      'current-user-id', // TODO: Get from context
      'User removed via API',
    );
    return this.commandBus.execute(command);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    const command = new ChangeUserPasswordCommand(
      id,
      'current-user-id', // TODO: Get from context
      changePasswordDto.password,
    );
    return this.commandBus.execute(command);
  }

  async changeOwnPassword(payload: ChangeOwnPasswordDto) {
    if (!payload.currentUserId || !payload.newPassword) {
      return {
        success: false,
        message: 'Missing user or password',
        statusCode: 400,
      };
    }

    const command = new ChangeUserPasswordCommand(
      payload.currentUserId,
      payload.currentUserId,
      payload.newPassword,
    );
    return this.commandBus.execute(command);
  }

  // Legacy method for backward compatibility
  async findOne(id: string) {
    return this.getUserById(id);
  }

  // Legacy method for backward compatibility
  async findAll(search?: string) {
    return this.getAllUsers(search);
  }

  // Legacy method for backward compatibility
  async create(createUserDto: CreateUserDto) {
    return this.createUser(createUserDto);
  }

  // Legacy method for backward compatibility
  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.updateUser(id, updateUserDto);
  }

  // Legacy method for backward compatibility
  async delete(id: string) {
    return this.removeUser(id);
  }
}
