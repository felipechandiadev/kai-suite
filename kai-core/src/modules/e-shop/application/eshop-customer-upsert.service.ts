import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person, PersonType } from '@modules/persons/domain/person.entity';

@Injectable()
export class EShopCustomerUpsertService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async upsertByEmail(params: {
    companyId: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
  }): Promise<Customer> {
    const email = params.email.trim().toLowerCase();
    const nameParts = params.name.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? 'Cliente';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    let person = await this.personRepo.findOne({
      where: {
        companyId: params.companyId,
        email,
        deletedAt: IsNull(),
      },
    });

    if (!person) {
      person = this.personRepo.create({
        companyId: params.companyId,
        type: PersonType.NATURAL,
        firstName,
        lastName,
        email,
        phone: params.phone?.trim() || undefined,
        address: params.address?.trim() || undefined,
      });
      person = await this.personRepo.save(person);
    } else {
      let dirty = false;
      if (firstName && person.firstName !== firstName) {
        person.firstName = firstName;
        dirty = true;
      }
      if (lastName && person.lastName !== lastName) {
        person.lastName = lastName;
        dirty = true;
      }
      if (params.phone?.trim() && person.phone !== params.phone.trim()) {
        person.phone = params.phone.trim();
        dirty = true;
      }
      if (params.address?.trim() && person.address !== params.address.trim()) {
        person.address = params.address.trim();
        dirty = true;
      }
      if (dirty) {
        person = await this.personRepo.save(person);
      }
    }

    let customer = await this.customerRepo.findOne({
      where: {
        companyId: params.companyId,
        personId: person.id,
        deletedAt: IsNull(),
      },
    });

    if (!customer) {
      customer = this.customerRepo.create({
        companyId: params.companyId,
        personId: person.id,
        creditLimit: 0,
        currentBalance: 0,
        isActive: true,
        notes: 'Cliente creado desde eShop',
      });
      customer = await this.customerRepo.save(customer);
    }

    return customer;
  }
}
