import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export const LITE_USER_ROLES = ['ADMIN', 'POS_OPERATOR'] as const;

export type LiteUserRoleCode = (typeof LITE_USER_ROLES)[number];

export class LiteCreateUserDto {
  @ApiProperty({ example: 'cajero2' })
  @IsString()
  @MinLength(3)
  userName!: string;

  @ApiProperty({ example: 'cajero2@local' })
  @IsEmail()
  mail!: string;

  @ApiProperty({ example: 'secret12' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: LITE_USER_ROLES, example: 'POS_OPERATOR' })
  @IsIn([...LITE_USER_ROLES])
  role!: LiteUserRoleCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}
