import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateItineraryStopDto {
  @ApiProperty({
    description: 'The display name of the stop',
    example: 'Eiffel Tower',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly name: string;

  @ApiProperty({
    description: 'The Google Places ID of the stop',
    example: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly googlePlaceId: string;

  @ApiProperty({
    description: 'The cached location of the stop',
    example: '48.8583701,2.2944813',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly location: string;

  @ApiProperty({
    description: 'The order of the stop within the itinerary day',
    example: 1,
  })
  @IsInt()
  declare readonly order: number;

  @ApiPropertyOptional({
    description: 'A free-text note about the stop',
    example: 'Buy tickets in advance',
  })
  @IsOptional()
  @IsString()
  declare readonly note: string | undefined;

  @ApiPropertyOptional({
    description: 'The scheduled time for the stop',
    example: '2023-01-01T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  declare readonly scheduledTime: string | undefined;
}
