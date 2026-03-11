import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum MetricsGroupBy {
  DAY = 'day',
  MONTH = 'month',
}

export class GetMetricsQueryDto {
  @IsString()
  metricCode!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsEnum(MetricsGroupBy)
  groupBy!: MetricsGroupBy;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  authMethod?: string;

  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  providerId?: number;
}
