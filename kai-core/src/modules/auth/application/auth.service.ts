import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from './ports/auth.repository.port';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: AuthRepositoryPort,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { userName, password } = loginDto;

    // Find user by username
    const user = await this.authRepository.findUserByUsername(userName);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verify password - support both bcrypt and legacy SHA256
    let isValid = false;

    if (user.pass?.startsWith('$2')) {
      // bcrypt hash
      isValid = await bcrypt.compare(password, user.pass);
    } else if (user.pass) {
      // Legacy SHA256 hash - upgrade to bcrypt if valid
      const legacyHash = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
      if (legacyHash === user.pass) {
        isValid = true;
        try {
          const upgradedHash = await bcrypt.hash(password, 12);
          user.pass = upgradedHash;
          await this.authRepository.saveUser(user);
        } catch (upgradeError) {
          console.error('Error upgrading password hash:', upgradeError);
        }
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Build response
    return {
      success: true,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.mail,
        rol: user.rol,
        companyId: user.companyId ?? null,
        person: user.person
          ? {
              id: user.person.id,
              firstName: user.person.firstName,
              lastName: user.person.lastName || '',
              email: user.person.email || null,
              phone: user.person.phone || null,
            }
          : null,
      },
    };
  }

  /**
   * Log logout action
   */
  async logout(userId: string): Promise<void> {
    // Simplified logout - just acknowledge for now
    console.log('User logged out:', userId);
  }
}
