import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ChangePasswordCommandHandler } from '@modules/auth/application/handlers/commands/change-password.handler';
import { ChangePasswordCommand } from '@modules/auth/application/commands/change-password.command';
import { AUTH_REPOSITORY } from '@modules/auth/application/ports/auth.repository.port';

describe('ChangePasswordCommandHandler', () => {
  let handler: ChangePasswordCommandHandler;
  const saveUser = jest.fn();
  const findUserById = jest.fn();

  beforeEach(async () => {
    saveUser.mockReset();
    findUserById.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangePasswordCommandHandler,
        {
          provide: AUTH_REPOSITORY,
          useValue: { findUserById, saveUser },
        },
      ],
    }).compile();
    handler = module.get(ChangePasswordCommandHandler);
  });

  it('updates password when current is valid', async () => {
    const hash = await bcrypt.hash('old-secret', 10);
    findUserById.mockResolvedValue({ id: 'user-1', pass: hash });
    saveUser.mockImplementation(async (u: { pass: string }) => u);

    const result = await handler.execute(
      new ChangePasswordCommand('user-1', 'old-secret', 'new-secret', 'new-secret'),
    );

    expect(result.success).toBe(true);
    expect(saveUser).toHaveBeenCalled();
    const saved = saveUser.mock.calls[0][0] as { pass: string };
    expect(await bcrypt.compare('new-secret', saved.pass)).toBe(true);
  });

  it('rejects wrong current password', async () => {
    const hash = await bcrypt.hash('old-secret', 10);
    findUserById.mockResolvedValue({ id: 'user-1', pass: hash });

    await expect(
      handler.execute(
        new ChangePasswordCommand('user-1', 'wrong', 'new-secret', 'new-secret'),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(saveUser).not.toHaveBeenCalled();
  });

  it('rejects confirm mismatch', async () => {
    await expect(
      handler.execute(
        new ChangePasswordCommand('user-1', 'old', 'new-secret', 'other'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
