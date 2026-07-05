import { plainToInstance, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  declare DATABASE_URL: string;

  @IsOptional()
  @IsString()
  declare TEST_DATABASE_URL?: string;

  @IsString()
  declare JWT_ACCESS_SECRET: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value as string, 10))
  declare JWT_ACCESS_EXPIRES_IN_SECONDS: number;

  @IsString()
  declare JWT_REFRESH_SECRET: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value as string, 10))
  declare JWT_REFRESH_EXPIRES_IN_SECONDS: number;

  @IsString()
  declare GOOGLE_CLIENT_ID: string;

  @IsString()
  declare GOOGLE_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  declare GOOGLE_CALLBACK_URL: string;

  @IsUrl({ require_tld: false })
  declare FRONTEND_URL: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
