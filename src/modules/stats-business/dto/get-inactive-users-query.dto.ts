import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class GetInactiveUsersQueryDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;
}
