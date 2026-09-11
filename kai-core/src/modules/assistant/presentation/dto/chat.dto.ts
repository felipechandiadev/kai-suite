import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AssistantChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class AssistantSpeakDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  text!: string;
}

export class AssistantFeedbackDto {
  @IsUUID()
  auditId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  feedback!: string;
}

export class AssistantFavoriteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;
}

export class AssistantScheduledDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cronExpr?: string;
}
