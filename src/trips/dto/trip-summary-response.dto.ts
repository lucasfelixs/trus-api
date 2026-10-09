import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class TripSummaryResponseDto {
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

  @ApiProperty({
    description: 'The destination of the trip',
    example: 'Paris',
  })
  @Expose()
  declare readonly destination: string;

  @ApiProperty({
    description: 'The start date of the trip',
    example: '2026-05-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly startDate: string;

  @ApiProperty({
    description: 'The end date of the trip',
    example: '2026-05-08T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly endDate: string;

  @ApiProperty({
    description: 'How many itineraries belong to the trip',
    example: 3,
  })
  @Expose()
  declare readonly itineraryCount: number;

  @ApiProperty({
    description: 'How many of those itineraries are published',
    example: 2,
  })
  @Expose()
  declare readonly publishedItineraryCount: number;
}
