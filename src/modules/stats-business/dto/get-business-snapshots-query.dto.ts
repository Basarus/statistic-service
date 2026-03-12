import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetBusinessSnapshotsQueryDto {
  @ApiProperty({ example: 1001 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @ApiProperty({ example: 'users_without_personal_account' })
  @IsString()
  @IsNotEmpty()
  metricCode!: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ example: 'region_1' })
  @IsOptional()
  @IsString()
  dimensionKey?: string;
}
