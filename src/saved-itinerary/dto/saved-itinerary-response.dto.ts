import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';
import { ItineraryResponseDto } from '../../itinerary/dto/itinerary-response.dto';

export class SavedItineraryResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the saved itinerary record',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The date and time when the itinerary was saved',
    example: '2023-01-01T12:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;

  @ApiProperty({
    description: 'The saved itinerary',
    type: ItineraryResponseDto,
  })
  @Expose()
  @Type(() => ItineraryResponseDto)
  declare readonly itinerary: ItineraryResponseDto;
}
