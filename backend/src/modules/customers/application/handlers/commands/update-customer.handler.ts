import { Inject, BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCustomerCommand } from '../../commands/update-customer.command';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { CustomerUpdatedEvent } from '@modules/customers/domain/events/customer-updated.event';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { Person, PersonType } from '@modules/persons/domain/person.entity';
import { sanitizePersonGeoActivityFields } from '@modules/persons/application/person-geo-activity.util';

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly eventBus: EventBus,
    private readonly companiesService: CompaniesService,
  ) {}

  async execute(command: UpdateCustomerCommand) {
    const {
      customerId,
      creditLimit,
      paymentDayOfMonth,
      notes,
      isActive,
      firstName,
      lastName,
      businessName,
      documentType,
      documentNumber,
      email,
      phone,
      address,
      regionCode,
      regionName,
      communeCode,
      communeName,
      treasuryCode,
      economicActivities,
      userId,
    } = command;

    const customer = await this.customerRepository.findByIdWithPerson(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const person = customer.person;
    if (!person) {
      throw new Error('Cliente sin persona asociada');
    }

    if (creditLimit !== undefined) {
      const icc = await this.companiesService.getInternalCustomerCreditSettings(
        customer.companyId,
      );
      const lim = Number(creditLimit) || 0;
      if (!icc.enabled && lim > 0) {
        throw new BadRequestException(
          'El crédito interno está deshabilitado para esta empresa; el límite de crédito debe ser 0.',
        );
      }
    }

    const customerUpdate: Record<string, unknown> = {};
    if (creditLimit !== undefined) customerUpdate.creditLimit = creditLimit;
    if (paymentDayOfMonth !== undefined)
      customerUpdate.paymentDayOfMonth = paymentDayOfMonth;
    if (notes !== undefined) customerUpdate.notes = notes;
    if (isActive !== undefined) customerUpdate.isActive = isActive;

    const isNatural = person.type === PersonType.NATURAL;

    let personTouched = false;

    if (firstName !== undefined) {
      const v = firstName.trim();
      if (isNatural && v.length === 0) {
        throw new BadRequestException('El nombre es obligatorio.');
      }
      person.firstName = v;
      personTouched = true;
    }
    if (lastName !== undefined) {
      person.lastName = lastName.trim() || undefined;
      personTouched = true;
    }
    if (businessName !== undefined) {
      person.businessName = businessName.trim() || undefined;
      personTouched = true;
    }
    if (documentType !== undefined) {
      person.documentType = documentType as any;
      personTouched = true;
    }
    if (documentNumber !== undefined) {
      const nextDoc = documentNumber.trim() || undefined;
      if (nextDoc && nextDoc !== (person.documentNumber || '')) {
        const dup = await this.personRepository.findOne({
          where: {
            documentNumber: nextDoc,
            companyId: customer.companyId,
          },
        });
        if (dup && dup.id !== person.id) {
          throw new ConflictException(
            'Ya existe otro registro con ese número de documento.',
          );
        }
      }
      person.documentNumber = nextDoc;
      personTouched = true;
    }
    if (email !== undefined) {
      person.email = email.trim() || undefined;
      personTouched = true;
    }
    if (phone !== undefined) {
      person.phone = phone.trim() || undefined;
      personTouched = true;
    }
    if (address !== undefined) {
      person.address = address.trim() || undefined;
      personTouched = true;
    }

    if (
      regionCode !== undefined ||
      regionName !== undefined ||
      communeCode !== undefined ||
      communeName !== undefined ||
      treasuryCode !== undefined ||
      economicActivities !== undefined
    ) {
      const geo = sanitizePersonGeoActivityFields({
        regionCode,
        regionName,
        communeCode,
        communeName,
        treasuryCode,
        economicActivities,
      });
      Object.assign(person, geo);
      personTouched = true;
    }

    if (personTouched) {
      await this.personRepository.save(person);
    }

    if (Object.keys(customerUpdate).length > 0) {
      await this.customerRepository.update(customerId, customerUpdate as any);
    }

    const updatedCustomer = await this.customerRepository.findById(customerId);
    if (!updatedCustomer) {
      throw new Error('Cliente no encontrado tras actualizar');
    }

    this.eventBus.publish(new CustomerUpdatedEvent(customerId, userId));

    return updatedCustomer;
  }
}
