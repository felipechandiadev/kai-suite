import * as crypto from 'crypto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersServiceAdapter } from '@modules/users/application/users.service.adapter';
import { CreateUserCommand } from '@modules/users/application/commands/create-user.command';
import { UpdateUserCommand } from '@modules/users/application/commands/update-user.command';
import { RemoveUserCommand } from '@modules/users/application/commands/remove-user.command';
import { ChangeUserPasswordCommand } from '@modules/users/application/commands/change-user-password.command';
import { GetUserQuery } from '@modules/users/application/queries/get-user.query';
import { GetAllUsersQuery } from '@modules/users/application/queries/get-all-users.query';

describe('UsersServiceAdapter', () => {
  let service: UsersServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    service = new UsersServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch GetAllUsersQuery with defaults', async () => {
    queryBus.execute.mockResolvedValueOnce({ data: [], total: 0 });

    await service.getAllUsers('john');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllUsersQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      limit: 50,
      offset: 0,
      search: 'john',
    });
  });

  it('should dispatch GetUserQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ id: 'user-1' });

    await service.getUserById('user-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetUserQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ userId: 'user-1' });
  });

  it('should dispatch CreateUserCommand with generated id', async () => {
    const generatedId = '22222222-2222-4222-8222-222222222222';
    const randomUuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(generatedId);
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.createUser({
      userName: 'john',
      mail: 'john@example.com',
      password: 'secret123',
      personId: 'person-1',
      rol: 'ADMIN',
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateUserCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      userId: generatedId,
      userName: 'john',
      mail: 'john@example.com',
      password: 'secret123',
      personId: 'person-1',
      role: 'ADMIN',
    });

    randomUuidSpy.mockRestore();
  });

  it('should dispatch UpdateUserCommand with placeholder current user id', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.updateUser('user-1', {
      userName: 'john-updated',
      mail: 'john.updated@example.com',
      rol: 'OPERATOR',
      phone: '123456',
      personName: 'John Updated',
      personDni: '987654',
    });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateUserCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      currentUserId: 'current-user-id',
      userName: 'john-updated',
      mail: 'john.updated@example.com',
      role: 'OPERATOR',
      phone: '123456',
      personName: 'John Updated',
      personDni: '987654',
    });
  });

  it('should dispatch RemoveUserCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.removeUser('user-1');

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(RemoveUserCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      currentUserId: 'current-user-id',
      reason: 'User removed via API',
    });
  });

  it('should dispatch ChangeUserPasswordCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.changePassword('user-1', { password: 'new-secret' });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(ChangeUserPasswordCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      currentUserId: 'current-user-id',
      newPassword: 'new-secret',
    });
  });

  it('should reject changeOwnPassword when payload is incomplete', async () => {
    const result = await service.changeOwnPassword({ currentUserId: undefined, newPassword: undefined });

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Missing user or password',
      statusCode: 400,
    });
  });

  it('should dispatch ChangeUserPasswordCommand for changeOwnPassword', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.changeOwnPassword({ currentUserId: 'user-1', newPassword: 'new-secret' });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(ChangeUserPasswordCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      currentUserId: 'user-1',
      newPassword: 'new-secret',
    });
  });
});