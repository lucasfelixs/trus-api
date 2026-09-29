import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { toIsoString } from '../../common/utils/helpers';

export class UserResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @Expose()
  declare readonly email: string;

  @ApiProperty({
    description: 'The display name of the user',
    example: 'Jane Doe',
  })
  @Expose()
  declare readonly name: string;

  @ApiPropertyOptional({
    description: 'The avatar URL provided by Google',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  @Expose()
  declare readonly avatarUrl: string | null;

  @ApiProperty({
    description: 'The date and time when the user was created',
    example: '2026-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @Expose()
  @Transform(toIsoString)
  declare readonly createdAt: string;
}
