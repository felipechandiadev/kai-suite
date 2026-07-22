import { IsIn, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushSubscriptionKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

class PushSubscriptionDto {
  @IsString()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

export class SubscribeWebPushDto {
  @IsIn(['pos', 'kds'])
  clientApp!: 'pos' | 'kds';

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription!: PushSubscriptionDto;

  @IsOptional()
  @IsUUID()
  productionUnitId?: string | null;
}

export class UnsubscribeWebPushDto {
  @IsString()
  endpoint!: string;
}
