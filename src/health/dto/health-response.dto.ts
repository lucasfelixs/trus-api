import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status of the API and its database connection',
    example: 'ok',
  })
  @Expose()
  declare readonly status: string;
}
