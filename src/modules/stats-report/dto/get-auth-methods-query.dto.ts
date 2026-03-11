import { Transform } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class GetAuthMethodsQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;
}
