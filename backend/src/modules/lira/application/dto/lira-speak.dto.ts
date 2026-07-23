import { IsOptional, IsString, MinLength } from 'class-validator';

export class LiraSpeakDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  voice?: string;
}
