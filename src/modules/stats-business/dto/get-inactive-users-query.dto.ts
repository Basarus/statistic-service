import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetInactiveUsersQueryDto {
  @ApiProperty({ example: 1001 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  organizationId!: number;
}
