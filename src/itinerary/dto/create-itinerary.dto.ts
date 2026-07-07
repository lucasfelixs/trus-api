import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateItineraryDto {
  @ApiProperty({
    description: 'The title of the itinerary',
    example: 'Day 1: Arrival and Sightseeing',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly title: string;

  @ApiPropertyOptional({
    description: 'The description of the itinerary',
    example:
      'Arrive in the morning, check into the hotel, and explore the city in the afternoon.',
  })
  @IsOptional()
  @IsString()
  declare readonly description: string | undefined;
}
