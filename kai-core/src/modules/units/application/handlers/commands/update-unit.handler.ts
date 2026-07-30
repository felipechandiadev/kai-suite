import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { UpdateUnitCommand } from '../../commands/update-unit.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOrmEntity } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { TenantContext } from '@common/tenant';

@CommandHandler(UpdateUnitCommand)
export class UpdateUnitCommandHandler implements ICommandHandler<
  UpdateUnitCommand,
  Unit
> {
  private readonly logger = new Logger(UpdateUnitCommandHandler.name);

  constructor(
    @InjectRepository(UnitOrmEntity)
    private readonly unitRepository: Repository<UnitOrmEntity>,
  ) {}

  async execute(command: UpdateUnitCommand): Promise<Unit> {
    this.logger.debug(`Updating unit ${command.unitId}`);

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

    if (command.name !== undefined) unit.name = command.name;
    if (command.dimension !== undefined)
      unit.dimension = command.dimension as any;
    if (command.conversionFactor !== undefined)
      unit.conversionFactor = command.conversionFactor;
    if (command.allowDecimals !== undefined)
      unit.allowDecimals = command.allowDecimals;
    if (command.active !== undefined) unit.active = command.active;

    const updated = await this.unitRepository.save(unit);
    this.logger.debug(`Unit ${updated.id} updated successfully`);

    // Convert ORM to Domain
    return this.ormToDomain(updated);
  }

  private ormToDomain(orm: UnitOrmEntity): Unit {
    const unit = new Unit();
    unit.id = orm.id;
    unit.name = orm.name;
    unit.symbol = orm.symbol;
    unit.dimension = orm.dimension;
    unit.conversionFactor = orm.conversionFactor;
    unit.allowDecimals = orm.allowDecimals;
    unit.isBase = orm.isBase;
    unit.baseUnitId = orm.baseUnitId;
    unit.active = orm.active;
    unit.createdAt = orm.createdAt;
    unit.updatedAt = orm.updatedAt;
    unit.deletedAt = orm.deletedAt;
    return unit;
  }
}
