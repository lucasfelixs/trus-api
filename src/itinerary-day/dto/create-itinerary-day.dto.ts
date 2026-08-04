import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateItineraryDayDto {
  @ApiProperty({
    description: 'The title of the itinerary day',
    example: 'Day 1: Arrival and Sightseeing',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly title: string;

  @ApiProperty({
    description: 'The date of the itinerary day',
    example: '2023-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  declare readonly date: string;
}
