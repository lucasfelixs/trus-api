import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'The rating given to the itinerary, from 1 to 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  declare readonly rating: number;

  @ApiPropertyOptional({
    description: 'An optional comment about the itinerary',
    example: 'Loved the pace of this itinerary, would follow it again.',
  })
  @IsOptional()
  @IsString()
  declare readonly comment: string | undefined;
}
