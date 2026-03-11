import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CurrentMonthWidgetQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;
}
