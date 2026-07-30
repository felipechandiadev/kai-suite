import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Shareholder } from '../domain/shareholder.entity';
import { Person, PersonType, DocumentType } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import type { CreateShareholderBody } from './dto/create-shareholder.dto';

@Injectable()
export class ShareholdersService {
  constructor(
    @InjectRepository(Shareholder)
    private readonly shareholderRepository: Repository<Shareholder>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async listShareholders(companyId?: string) {
    const where: { deletedAt: any; companyId?: string } = { deletedAt: IsNull() };
    if (companyId) {
      where.companyId = companyId;
    }
    const shareholders = await this.shareholderRepository.find({
      where,
      relations: { person: true },
      order: { createdAt: 'ASC' },
    });

    return (shareholders || []).map((shareholder) => {
      if (!shareholder.person) {
        return shareholder;
      }

      const displayName =
        shareholder.person.businessName?.trim() ||
        [shareholder.person.firstName, shareholder.person.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

      return {
        ...shareholder,
        person: {
          ...shareholder.person,
          displayName,
        },
      };
    });
  }

  async create(body: CreateShareholderBody) {
    const companyId = String(body.companyId || '').trim();
    if (!companyId) {
      throw new BadRequestException('companyId es obligatorio');
    }
    const company = await this.companyRepository.findOne({
      where: { id: companyId, deletedAt: IsNull() as never },
    });
    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }

    const firstName = String(body.firstName || '').trim();
    if (!firstName) {
      throw new BadRequestException('Nombre es obligatorio');
    }
    const documentNumber = String(body.documentNumber || '').trim();
    if (!documentNumber) {
      throw new BadRequestException('Número de documento es obligatorio');
    }

    const existingPerson = await this.personRepository.findOne({
      where: { documentNumber, deletedAt: IsNull() as never },
    });
    let person: Person;
    if (existingPerson) {
      person = existingPerson;
      if (body.personType != null) {
        person.type = body.personType;
      }
      person.firstName = firstName;
      if (body.lastName != null) {
        person.lastName = String(body.lastName).trim() || undefined;
      }
      if (body.businessName != null) {
        person.businessName = String(body.businessName).trim() || undefined;
      }
      person.documentType = body.documentType as DocumentType;
      if (body.email != null) {
        person.email = String(body.email).trim() || undefined;
      }
      if (body.phone != null) {
        person.phone = String(body.phone).trim() || undefined;
      }
      person = await this.personRepository.save(person);
    } else {
      person = await this.personRepository.save(
        this.personRepository.create({
          type: body.personType ?? PersonType.NATURAL,
          firstName,
          lastName: body.lastName?.trim() || undefined,
          businessName: body.businessName?.trim() || undefined,
          documentType: body.documentType as DocumentType,
          documentNumber,
          email: body.email?.trim() || undefined,
          phone: body.phone?.trim() || undefined,
        }),
      );
    }

    const dup = await this.shareholderRepository.findOne({
      where: { companyId, personId: person.id, deletedAt: IsNull() },
    });
    if (dup) {
      throw new BadRequestException('Esta persona ya está registrada como socio de la empresa.');
    }

    const ownership =
      body.ownershipPercentage != null && Number.isFinite(Number(body.ownershipPercentage))
        ? Number(body.ownershipPercentage)
        : null;

    const row = this.shareholderRepository.create({
      companyId,
      personId: person.id,
      ownershipPercentage: ownership,
      partnerType: body.partnerType?.trim() || null,
      joinDate: body.joinDate?.trim() || null,
      notes: body.notes?.trim() || null,
      isActive: true,
    });
    const saved = await this.shareholderRepository.save(row);
    const full = await this.shareholderRepository.findOne({
      where: { id: saved.id },
      relations: { person: true },
    });
    return full;
  }

  async remove(companyId: string, id: string) {
    const row = await this.shareholderRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!row) {
      throw new NotFoundException('Socio no encontrado');
    }
    await this.shareholderRepository.softRemove(row);
    return { success: true };
  }
}
