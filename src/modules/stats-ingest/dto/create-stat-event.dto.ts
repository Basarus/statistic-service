import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum PlatformType {
  WEB = 'web',
  MOBILE = 'mobile',
}

export enum AuthMethodType {
  EMAIL = 'email',
  PHONE = 'phone',
  VK = 'vk',
  GOSUSLUGI = 'gosuslugi',
  OTHER = 'other',
}

export class CreateStatEventDto {
  @IsUUID()
  eventUuid!: string;

  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @IsString()
  @IsNotEmpty()
  eventCategory!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsNumber()
  organizationId!: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  personalAccountId?: string;

  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @IsOptional()
  @IsEnum(AuthMethodType)
  authMethod?: AuthMethodType;

  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @IsNumber()
  providerId?: number;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsBoolean()
  isSuccess!: boolean;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  sourceSystem!: string;
}
