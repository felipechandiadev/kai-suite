import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { EshopCustomerAccount } from '../domain/eshop-customer-account.entity';
import { EShopCustomerUpsertService } from './eshop-customer-upsert.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { Person, DocumentType } from '@modules/persons/domain/person.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { normalizeEshopUsername } from './helpers/eshop-username.util';

const MIN_PASSWORD_LENGTH = 8;

function buildEshopVerificationUrl(token: string): string {
  const base = (
    process.env.ESHOP_PUBLIC_SITE_URL?.trim() || 'http://localhost:5064'
  ).replace(/\/$/, '');
  return `${base}/cuenta/verificar-email?token=${encodeURIComponent(token)}`;
}

export type EshopCustomerSession = {
  accountId: string;
  customerId: string;
  companyId: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
};

@Injectable()
export class EshopCustomerAuthService {
  constructor(
    @InjectRepository(EshopCustomerAccount)
    private readonly accountRepo: Repository<EshopCustomerAccount>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly customerUpsert: EShopCustomerUpsertService,
    private readonly companiesService: CompaniesService,
    private readonly kaiMail: KaiMailClient,
  ) {}

  async checkUsernameAvailable(
    companyId: string,
    rawUsername: string,
  ): Promise<{ available: boolean; message?: string }> {
    await this.assertPortalEnabled(companyId);
    const normalized = normalizeEshopUsername(rawUsername);
    if (!normalized.ok) {
      return { available: false, message: normalized.message };
    }
    const existing = await this.accountRepo.findOne({
      where: { companyId, username: normalized.username },
    });
    if (existing) {
      return { available: false, message: 'Este nombre de usuario ya está en uso' };
    }
    return { available: true };
  }

  async register(
    companyId: string,
    body: {
      username: string;
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      phone?: string;
      documentNumber?: string;
    },
  ): Promise<{ sessionToken: string; emailVerificationRequired: boolean }> {
    await this.assertPortalEnabled(companyId);
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    const requireRut = settings.eShopRegistrationRequireRut === true;

    const usernameResult = normalizeEshopUsername(body.username);
    if (!usernameResult.ok) {
      throw new BadRequestException(usernameResult.message);
    }
    const username = usernameResult.username;

    const email = body.email.trim().toLowerCase();
    if (!email || !body.password?.trim()) {
      throw new BadRequestException('Email y contraseña son obligatorios');
    }
    if (body.password.trim().length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      );
    }
    if (requireRut && !body.documentNumber?.trim()) {
      throw new BadRequestException('El RUT es obligatorio para registrarse');
    }

    const existingUsername = await this.accountRepo.findOne({
      where: { companyId, username },
    });
    if (existingUsername) {
      throw new ConflictException('Este nombre de usuario ya está en uso');
    }

    const existingEmail = await this.accountRepo.findOne({
      where: { companyId, email },
    });
    if (existingEmail) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const customer = await this.customerUpsert.upsertByEmail({
      companyId,
      name: [body.firstName, body.lastName].filter(Boolean).join(' '),
      email,
      phone: body.phone,
    });

    if (body.documentNumber?.trim()) {
      const person = await this.personRepo.findOne({
        where: { id: customer.personId },
      });
      if (person) {
        person.documentNumber = body.documentNumber.trim();
        person.documentType = DocumentType.RUT;
        await this.personRepo.save(person);
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const sessionToken = randomUUID();
    const emailVerificationToken = randomBytes(24).toString('hex');
    const account = this.accountRepo.create({
      companyId,
      customerId: customer.id,
      email,
      username,
      passwordHash,
      sessionToken,
      emailVerificationToken,
      emailVerifiedAt: null,
    });
    await this.accountRepo.save(account);

    try {
      await this.kaiMail?.sendOrderTemplate({
        template: 'customer.verify_email',
        to: email,
        idempotencyKey: `verify:${account.id}`,
        variables: {
          customerName: body.firstName,
          verificationToken: emailVerificationToken,
          verificationUrl: buildEshopVerificationUrl(emailVerificationToken),
        },
      });
    } catch {
      /* optional mail */
    }

    return { sessionToken, emailVerificationRequired: true };
  }

  async login(
    companyId: string,
    body: { login: string; password: string },
  ): Promise<{ sessionToken: string }> {
    await this.assertPortalEnabled(companyId);
    const login = body.login?.trim();
    if (!login || !body.password?.trim()) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    let account: EshopCustomerAccount | null = null;
    if (login.includes('@')) {
      account = await this.accountRepo.findOne({
        where: { companyId, email: login.toLowerCase() },
      });
    } else {
      const usernameResult = normalizeEshopUsername(login);
      if (!usernameResult.ok) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      account = await this.accountRepo.findOne({
        where: { companyId, username: usernameResult.username },
      });
    }

    if (!account) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await bcrypt.compare(body.password, account.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    account.sessionToken = randomUUID();
    await this.accountRepo.save(account);
    return { sessionToken: account.sessionToken! };
  }

  async verifyEmail(companyId: string, token: string): Promise<void> {
    const account = await this.accountRepo.findOne({
      where: { companyId, emailVerificationToken: token.trim() },
    });
    if (!account) {
      throw new BadRequestException('Token de verificación inválido');
    }
    account.emailVerifiedAt = new Date();
    account.emailVerificationToken = null;
    await this.accountRepo.save(account);
  }

  async resolveSession(
    companyId: string,
    sessionToken: string,
  ): Promise<EshopCustomerSession | null> {
    const token = sessionToken?.trim();
    if (!token) return null;
    const account = await this.accountRepo.findOne({
      where: { companyId, sessionToken: token },
    });
    if (!account) return null;
    return {
      accountId: account.id,
      customerId: account.customerId,
      companyId: account.companyId,
      email: account.email,
      username: account.username?.trim() || null,
      emailVerified: Boolean(account.emailVerifiedAt),
    };
  }

  private async assertPortalEnabled(companyId: string): Promise<void> {
    const settings = await this.companiesService.getEShopFlatSettings(companyId);
    if (!settings.eShopEnabled) {
      throw new BadRequestException('Tienda no disponible');
    }
    if (settings.eShopCustomerPortalEnabled !== true) {
      throw new BadRequestException('El portal de cliente no está habilitado');
    }
  }
}
