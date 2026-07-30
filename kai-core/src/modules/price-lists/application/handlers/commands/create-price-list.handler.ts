import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePriceListCommand } from '@modules/price-lists/application/commands/create-price-list.command';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import {
  PriceListOrmEntity,
  PriceListType,
} from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

@CommandHandler(CreatePriceListCommand)
export class CreatePriceListCommandHandler implements ICommandHandler<CreatePriceListCommand> {
  constructor(
    @InjectRepository(PriceListOrmEntity)
    private readonly repository: Repository<PriceListOrmEntity>,
  ) {}

  async execute(command: CreatePriceListCommand): Promise<PriceList> {
    if (!command.name || command.name.trim().length === 0) {
      throw new BadRequestException('Price list name is required');
    }

    const priceList = new PriceListOrmEntity();
    priceList.id = this.generateId();
    priceList.name = command.name.trim();
    priceList.priceListType =
      (command.priceListType as PriceListType) || PriceListType.RETAIL;
    priceList.currency = command.currency || 'CLP';
    priceList.validFrom = command.validFrom
      ? new Date(command.validFrom)
      : undefined;
    priceList.validUntil = command.validUntil
      ? new Date(command.validUntil)
      : undefined;
    priceList.priority = command.priority ?? 0;
    priceList.isDefault = command.isDefault ?? false;
    priceList.isActive = command.isActive ?? true;
    priceList.description = command.description;

    const saved = await this.repository.save(priceList);
    return this.toDomain(saved);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
