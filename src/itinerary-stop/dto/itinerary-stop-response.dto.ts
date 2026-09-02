import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class ItineraryStopResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the itinerary stop',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The display name of the stop',
    example: 'Eiffel Tower',
  })
  @Expose()
  declare readonly name: string;

  @ApiProperty({
    description: 'The Google Places ID of the stop',
    example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
  })
  @Expose()
  declare readonly googlePlaceId: string;

  @ApiProperty({
    description: 'The cached location of the stop',
    example: '48.8583701,2.2944813',
  })
  @Expose()
  declare readonly location: string;

  @ApiProperty({
    description: 'The order of the stop within the itinerary day',
    example: 1,
  })
  @Expose()
  declare readonly order: number;

  @ApiPropertyOptional({
    description: 'A free-text note about the stop',
    example: 'Buy tickets in advance',
  })
  @Expose()
  declare readonly note: string | null;

  @ApiPropertyOptional({
    description: 'The scheduled time for the stop',
    example: '2023-01-01T14:00:00.000Z',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly scheduledTime: string | null;

  @ApiProperty({
    description: 'The ID of the itinerary day this stop belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly itineraryDayId: string;

  @ApiProperty({
    description: 'The creation date of the itinerary stop',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;

  @ApiProperty({
    description: 'The last update date of the itinerary stop',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly updatedAt: string;
}
