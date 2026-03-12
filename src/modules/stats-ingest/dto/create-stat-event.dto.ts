import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventUuid!: string;

  @ApiProperty({ example: 'auth.login.success' })
  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @ApiProperty({ example: 'auth' })
  @IsString()
  @IsNotEmpty()
  eventCategory!: string;

  @ApiProperty({ example: '2026-03-11T10:00:00.000Z' })
  @IsISO8601()
  occurredAt!: string;

  @ApiProperty({ example: 1001 })
  @IsNumber()
  organizationId!: number;

  @ApiPropertyOptional({ example: '8f9638ce-1451-4fd6-8f5e-a44ac9d7ecf5' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'f7818ca8-9c87-47a5-8799-5f938cfc0878' })
  @IsOptional()
  @IsUUID()
  personalAccountId?: string;

  @ApiPropertyOptional({ enum: PlatformType })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiPropertyOptional({ enum: AuthMethodType })
  @IsOptional()
  @IsEnum(AuthMethodType)
  authMethod?: AuthMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ example: 501 })
  @IsOptional()
  @IsNumber()
  providerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiProperty()
  @IsBoolean()
  isSuccess!: boolean;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiProperty({ example: 'lka-monolith' })
  @IsString()
  @IsNotEmpty()
  sourceSystem!: string;
}
