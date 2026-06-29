import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TripResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the trip',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The title of the trip',
    example: 'Trip to Paris',
  })
  @Expose()
  declare readonly title: string;

  @ApiPropertyOptional({
    description: 'The destination of the trip',
    example: 'Paris',
  })
  @Expose()
  declare readonly destination: string | null;

  @ApiProperty({
    description: 'The start date of the trip',
    example: '2023-01-01',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  declare readonly startDate: Date;

  @ApiProperty({
    description: 'The end date of the trip',
    example: '2023-01-07',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  declare readonly endDate: Date;

  @ApiProperty({
    description: 'The date and time when the trip was created',
    example: '2023-01-01T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  declare readonly createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the trip was last updated',
    example: '2023-01-02T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  declare readonly updatedAt: Date;
}
