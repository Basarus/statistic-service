import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpsertBusinessSnapshotDto {
  @IsDateString()
  snapshotDate!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsString()
  @IsNotEmpty()
  metricCode!: string;

  @IsOptional()
  @IsString()
  dimensionKey?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  valueTotal!: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
