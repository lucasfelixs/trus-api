import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class ItineraryResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the itinerary',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The title of the itinerary',
    example: 'Day 1: Arrival and City Tour',
  })
  @Expose()
  declare readonly title: string;

  @ApiPropertyOptional({
    description: 'The description of the itinerary',
    example:
      'Arrive in the city and take a guided tour of the main attractions.',
  })
  @Expose()
  declare readonly description: string | null;

  @ApiProperty({
    description: 'The share token for the itinerary',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly shareToken: string;

  @ApiProperty({
    description: 'The date and time when the itinerary was created',
    example: '2023-01-01T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;

  @ApiProperty({
    description: 'The date and time when the itinerary was last updated',
    example: '2023-01-02T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly updatedAt: string;

  @ApiProperty({
    description: 'The date and time when the itinerary was published',
    example: '2023-01-03T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly publishedAt: string | null;
}
