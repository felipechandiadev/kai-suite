import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { EshopCustomerAccount } from '../domain/eshop-customer-account.entity';
import { EShopCustomerUpsertService } from './eshop-customer-upsert.service';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { KaiMailClient } from '@shared/mail/kai-mail.client';
import { Person, DocumentType } from '@modules/persons/domain/person.entity';
import { Customer } from '@modules/customers/domain/customer.entity';

export type EshopCustomerSession = {
  accountId: string;
  customerId: string;
  companyId: string;
  email: string;
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

  async register(
    companyId: string,
    body: {
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
    const email = body.email.trim().toLowerCase();
    if (!email || !body.password?.trim()) {
      throw new BadRequestException('Email y contraseña son obligatorios');
    }
    if (requireRut && !body.documentNumber?.trim()) {
      throw new BadRequestException('El RUT es obligatorio para registrarse');
    }

    const existing = await this.accountRepo.findOne({
      where: { companyId, email },
    });
    if (existing) {
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
        },
      });
    } catch {
      /* optional mail */
    }

    return { sessionToken, emailVerificationRequired: true };
  }

  async login(
    companyId: string,
    body: { email: string; password: string },
  ): Promise<{ sessionToken: string }> {
    await this.assertPortalEnabled(companyId);
    const email = body.email.trim().toLowerCase();
    const account = await this.accountRepo.findOne({
      where: { companyId, email },
    });
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
