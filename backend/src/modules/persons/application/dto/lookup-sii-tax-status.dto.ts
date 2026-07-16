import { IsNotEmpty, IsString } from 'class-validator';

export class LookupSiiTaxStatusDto {
  @IsString()
  @IsNotEmpty()
  rut!: string;
}
