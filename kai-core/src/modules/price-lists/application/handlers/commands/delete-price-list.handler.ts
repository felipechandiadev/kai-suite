import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeletePriceListCommand } from '@modules/price-lists/application/commands/delete-price-list.command';
import { PriceListOrmEntity } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

@CommandHandler(DeletePriceListCommand)
export class DeletePriceListCommandHandler implements ICommandHandler<
  DeletePriceListCommand,
  void
> {
  constructor(
    @InjectRepository(PriceListOrmEntity)
    private readonly repository: Repository<PriceListOrmEntity>,
  ) {}

  async execute(command: DeletePriceListCommand): Promise<void> {
    const priceList = await this.repository.findOne({
      where: { id: command.id },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with ID ${command.id} not found`);
    }

    if (priceList.nonDeletable) {
      throw new ForbiddenException('This price list cannot be deleted');
    }

    // Soft delete using TypeORM's soft delete feature
    await this.repository.softDelete(command.id);
  }
}
