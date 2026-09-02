import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateItineraryDayDto {
  @ApiPropertyOptional({
    description: 'The title of the itinerary day',
    example: 'Day 1: Arrival and Sightseeing',
  })
  @IsOptional()
  @IsString()
  declare readonly title: string | undefined;

  @ApiProperty({
    description: 'The date of the itinerary day',
    example: '2023-01-01',
  })
  @IsDateString()
  declare readonly date: string;
}
