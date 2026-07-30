import { IsBoolean } from 'class-validator';

export class CompleteCertificationDto {
  @IsBoolean()
  portalValidated!: boolean;

  @IsBoolean()
  portalDeclarationDone!: boolean;
}
