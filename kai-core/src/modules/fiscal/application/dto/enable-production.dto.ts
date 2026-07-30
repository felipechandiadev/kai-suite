import { IsBoolean, IsEnum } from 'class-validator';
import { SiiEnvironment } from '../../domain/fiscal.enums';

export class EnableProductionDto {
  @IsBoolean()
  productionEnabled!: boolean;

  @IsEnum(SiiEnvironment)
  environment!: SiiEnvironment;
}
