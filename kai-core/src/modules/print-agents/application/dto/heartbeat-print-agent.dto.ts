import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class HeartbeatPrintAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  lanHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  wsPort!: number;

  @IsInt()
  @Min(1)
  @Max(65535)
  wssPort!: number;

  @IsOptional()
  @IsBoolean()
  useTls?: boolean;

  @IsOptional()
  @IsIn(['desktop', 'android', 'unknown'])
  platform?: 'desktop' | 'android' | 'unknown';
}
