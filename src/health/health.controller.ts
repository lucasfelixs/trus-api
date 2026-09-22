import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Check API and database health' })
  @ApiResponse({
    status: 200,
    description: 'API is up and the database connection is healthy',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'API is up but the database connection failed',
  })
  @Get()
  check(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
