import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertBusinessSnapshotDto {
  @ApiProperty({ example: '2026-03-11' })
  @IsDateString()
  snapshotDate!: string;

  @ApiProperty({ example: 1001 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @ApiProperty({ example: 'users_without_personal_account' })
  @IsString()
  @IsNotEmpty()
  metricCode!: string;

  @ApiPropertyOptional({ example: 'region_1' })
  @IsOptional()
  @IsString()
  dimensionKey?: string;

  @ApiProperty({ example: 120 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  valueTotal!: number;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
