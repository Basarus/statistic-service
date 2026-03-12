import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetricsGroupBy {
  DAY = 'day',
  MONTH = 'month',
}

export class GetMetricsQueryDto {
  @ApiProperty({ example: 'login_success' })
  @IsString()
  metricCode!: string;

  @ApiProperty({ example: 1001 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  dateTo!: string;

  @ApiProperty({ enum: MetricsGroupBy })
  @IsEnum(MetricsGroupBy)
  groupBy!: MetricsGroupBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ example: 501 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  providerId?: number;
}
