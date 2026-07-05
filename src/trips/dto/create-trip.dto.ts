import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({
    description: 'The title of the trip',
    example: 'Trip to Paris',
  })
  @IsNotEmpty()
  @IsString()
  declare readonly title: string;

  @ApiPropertyOptional({
    description: 'The destination of the trip',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  declare readonly destination: string | undefined;

  @ApiProperty({
    description: 'The start date of the trip',
    example: '2023-01-01',
  })
  @IsDateString()
  declare readonly startDate: string;

  @ApiProperty({
    description: 'The end date of the trip',
    example: '2023-01-07',
  })
  @IsDateString()
  declare readonly endDate: string;
}
