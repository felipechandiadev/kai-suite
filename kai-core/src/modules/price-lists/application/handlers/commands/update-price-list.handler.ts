import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdatePriceListCommand } from '@modules/price-lists/application/commands/update-price-list.command';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import {
  PriceListOrmEntity,
  PriceListType,
} from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

@CommandHandler(UpdatePriceListCommand)
export class UpdatePriceListCommandHandler implements ICommandHandler<UpdatePriceListCommand> {
  constructor(
    @InjectRepository(PriceListOrmEntity)
    private readonly repository: Repository<PriceListOrmEntity>,
  ) {}

  async execute(command: UpdatePriceListCommand): Promise<PriceList> {
    const priceList = await this.repository.findOne({
      where: { id: command.id },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with ID ${command.id} not found`);
    }

    // Update only provided fields
    if (command.name !== undefined) {
      if (command.name.trim().length === 0) {
        throw new BadRequestException('Price list name cannot be empty');
      }
      priceList.name = command.name.trim();
    }

    if (command.priceListType !== undefined) {
      priceList.priceListType = command.priceListType as any;
    }

    if (command.currency !== undefined) {
      priceList.currency = command.currency;
    }

    if (command.validFrom !== undefined) {
      priceList.validFrom = command.validFrom
        ? new Date(command.validFrom)
        : undefined;
    }

    if (command.validUntil !== undefined) {
      priceList.validUntil = command.validUntil
        ? new Date(command.validUntil)
        : undefined;
    }

    if (command.priority !== undefined) {
      priceList.priority = command.priority;
    }

    if (command.isDefault !== undefined) {
      priceList.isDefault = command.isDefault;
    }

    if (command.isActive !== undefined) {
      priceList.isActive = command.isActive;
    }

    if (command.description !== undefined) {
      priceList.description = command.description || undefined;
    }

    const updated = await this.repository.save(priceList);
    return this.toDomain(updated);
  }

  private toDomain(orm: PriceListOrmEntity): PriceList {
    return {
      id: orm.id,
      name: orm.name,
      priceListType: orm.priceListType as any,
      currency: orm.currency,
      validFrom: orm.validFrom,
      validUntil: orm.validUntil,
      priority: orm.priority,
      isDefault: orm.isDefault,
      isActive: orm.isActive,
      description: orm.description,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      deletedAt: orm.deletedAt,
    } as PriceList;
  }
}
