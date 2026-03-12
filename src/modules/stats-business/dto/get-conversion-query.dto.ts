import { Transform } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetConversionQueryDto {
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
}
