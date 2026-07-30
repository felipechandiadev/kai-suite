import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class FiscalCryptoService implements OnModuleInit {
  private readonly logger = new Logger(FiscalCryptoService.name);
  private key: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw = this.config.get<string>('FISCAL_ENCRYPTION_KEY');
    if (!raw) {
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      if (isProd) {
        throw new Error('FISCAL_ENCRYPTION_KEY is required for fiscal module');
      }
      this.logger.warn(
        'FISCAL_ENCRYPTION_KEY no configurada — el backend arranca, pero certificado/CAF fallarán hasta configurarla (envs/shared.env.example)',
      );
      return;
    }
    this.key = this.parseKey(raw);
  }

  private parseKey(raw: string): Buffer {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('FISCAL_ENCRYPTION_KEY must be 32 bytes base64-encoded');
    }
    return key;
  }

  private ensureKey(): Buffer {
    if (!this.key) {
      throw new BadRequestException(
        'FISCAL_ENCRYPTION_KEY no configurada. Ejecute npm run env:dev o añádala a kai-core/.env',
      );
    }
    return this.key;
  }

  encrypt(plain: Buffer | string): { data: Buffer; iv: string } {
    const key = this.ensureKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const input = typeof plain === 'string' ? Buffer.from(plain, 'utf8') : plain;
    const enc = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      data: Buffer.concat([enc, tag]),
      iv: iv.toString('base64'),
    };
  }

  decrypt(data: Buffer, ivB64: string): Buffer {
    const key = this.ensureKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = data.subarray(data.length - 16);
    const enc = data.subarray(0, data.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  }
}
