import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class ItineraryDayResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the itinerary day',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiPropertyOptional({
    description: 'The title of the itinerary day',
    example: 'Day 1: Arrival and City Tour',
  })
  @Expose()
  declare readonly title: string | null;

  @ApiProperty({
    description: 'The date of the itinerary day',
    example: '2023-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly date: string;

  @ApiProperty({
    description: 'The creation date of the itinerary day',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;

  @ApiProperty({
    description: 'The last update date of the itinerary day',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly updatedAt: string;
}
