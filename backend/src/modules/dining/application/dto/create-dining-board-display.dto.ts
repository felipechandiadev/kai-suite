import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDiningBoardDisplayDto {
  @IsUUID()
  branchId!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
