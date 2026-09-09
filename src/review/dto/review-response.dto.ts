import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class ReviewResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the review',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The rating given to the itinerary, from 1 to 5',
    example: 5,
  })
  @Expose()
  declare readonly rating: number;

  @ApiPropertyOptional({
    description: 'An optional comment about the itinerary',
    example: 'Loved the pace of this itinerary, would follow it again.',
  })
  @Expose()
  declare readonly comment: string | null;

  @ApiProperty({
    description: 'The ID of the user who wrote the review',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly userId: string;

  @ApiProperty({
    description: 'The ID of the reviewed itinerary',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly itineraryId: string;

  @ApiProperty({
    description: 'The date and time when the review was created',
    example: '2023-01-01T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;

  @ApiProperty({
    description: 'The date and time when the review was last updated',
    example: '2023-01-02T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly updatedAt: string;
}
