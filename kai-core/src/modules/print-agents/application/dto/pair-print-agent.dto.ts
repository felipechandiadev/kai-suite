import { IsString, MinLength } from 'class-validator';

export class PairPrintAgentDto {
  @IsString()
  @MinLength(16)
  pairingToken!: string;
}
