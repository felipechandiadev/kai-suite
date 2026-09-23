import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Lite shell sends `email`; value may be username (e.g. "admin") or mail. */
export class LiteLoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin1234', minLength: 4 })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  password!: string;
}
