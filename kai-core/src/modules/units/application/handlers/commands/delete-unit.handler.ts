import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { DeleteUnitCommand } from '../../commands/delete-unit.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { TenantContext } from '@common/tenant';

@CommandHandler(DeleteUnitCommand)
export class DeleteUnitCommandHandler implements ICommandHandler<
  DeleteUnitCommand,
  void
> {
  private readonly logger = new Logger(DeleteUnitCommandHandler.name);

  constructor(
    @InjectRepository(UnitOrmEntity)
    private readonly unitRepository: Repository<UnitOrmEntity>,
  ) {}

  async execute(command: DeleteUnitCommand): Promise<void> {
    this.logger.debug(`Deleting unit ${command.unitId}`);

    const companyId = TenantContext.getCompanyId();
    if (!companyId) {
      throw new ForbiddenException(
        'No hay empresa activa. Las unidades son por empresa.',
      );
    }

    const unit = await this.unitRepository.findOne({
      where: { id: command.unitId, companyId },
    });
    if (!unit) {
      throw new NotFoundException(`Unit ${command.unitId} not found`);
    }

    unit.deletedAt = new Date();
    await this.unitRepository.save(unit);

    this.logger.debug(`Unit ${command.unitId} deleted successfully`);
  }
}
