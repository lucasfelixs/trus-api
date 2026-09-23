import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    await this.prisma.$queryRaw`SELECT 1`;

    return plainToInstance(
      HealthResponseDto,
      { status: 'ok' },
      { excludeExtraneousValues: true },
    );
  }
}
