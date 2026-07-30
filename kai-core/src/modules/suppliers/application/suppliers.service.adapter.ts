import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PersonsService } from '@modules/persons/application/persons.service';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierCommand } from './commands/create-supplier.command';
import { UpdateSupplierCommand } from './commands/update-supplier.command';
import { RemoveSupplierCommand } from './commands/remove-supplier.command';
import { GetAllSuppliersQuery } from './queries/get-all-suppliers.query';
import { GetSupplierQuery } from './queries/get-supplier.query';
import { Supplier, SupplierType } from '../domain/supplier.entity';
import type { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersServiceAdapter extends SuppliersService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly personsService: PersonsService,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {
    super(null as any);
  }

  async findAll(params?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    supplierType?: string;
  }): Promise<{ data: Supplier[]; total: number }> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    return this.queryBus.execute(
      new GetAllSuppliersQuery(limit, offset, params?.isActive, params?.supplierType),
    );
  }

  async findOne(id: string): Promise<Supplier> {
    return this.queryBus.execute(new GetSupplierQuery(id));
  }

  async create(dto: CreateSupplierDto) {
    if (dto.person && dto.personId) {
      throw new BadRequestException(
        'Envíe solo personId o los datos de person, no ambos.',
      );
    }
    if (!dto.person && !dto.personId) {
      throw new BadRequestException('Debe indicar personId o los datos de la persona.');
    }

    let personId = dto.personId as string;
    if (dto.person) {
      const person = await this.personsService.create(dto.person);
      personId = person.id;
    }

    const existing = await this.suppliersRepository.findOne({
      where: { personId, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un proveedor asociado a esta persona.',
      );
    }

    const command = new CreateSupplierCommand(
      personId,
      dto.supplierType ?? SupplierType.DISTRIBUTOR,
      dto.defaultPaymentTermDays ?? 0,
      'system-user',
      dto.alias,
      dto.notes,
    );

    return this.commandBus.execute(command);
  }

  async update(id: string, dto: any) {
    const command = new UpdateSupplierCommand(
      id,
      'system-user',
      dto.supplierType,
      dto.alias,
      dto.defaultPaymentTermDays,
      dto.isActive,
      dto.notes,
      dto.person,
    );

    return this.commandBus.execute(command);
  }

  async remove(id: string) {
    const command = new RemoveSupplierCommand(id, 'system-user');
    await this.commandBus.execute(command);
  }
}
