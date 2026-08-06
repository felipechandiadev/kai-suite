import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ChangePasswordCommand } from '../../commands/change-password.command';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '@modules/auth/application/ports/auth.repository.port';

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordCommandHandler
  implements ICommandHandler<ChangePasswordCommand, ChangePasswordResult>
{
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
  ) {}

  async execute(
    command: ChangePasswordCommand,
  ): Promise<ChangePasswordResult> {
    const currentPassword = String(command.currentPassword ?? '');
    const newPassword = String(command.newPassword ?? '');
    const confirmPassword = String(command.confirmPassword ?? '');

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('La confirmación no coincide');
    }

    const user = await this.authRepository.findUserById(command.userId);
    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const isValid = await this.verifyPassword(currentPassword, user.pass);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    user.pass = await bcrypt.hash(newPassword, 12);
    await this.authRepository.saveUser(user);

    return { success: true, message: 'Contraseña actualizada' };
  }

  private async verifyPassword(
    plain: string,
    stored: string | null | undefined,
  ): Promise<boolean> {
    if (!stored) return false;
    if (stored.startsWith('$2')) {
      return bcrypt.compare(plain, stored);
    }
    const legacyHash = crypto.createHash('sha256').update(plain).digest('hex');
    return legacyHash === stored;
  }
}
