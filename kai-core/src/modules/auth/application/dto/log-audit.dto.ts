import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LogAuditDto {
  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT';

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  details?: string;
}
