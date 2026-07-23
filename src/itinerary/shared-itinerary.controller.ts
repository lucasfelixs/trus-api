import { Controller, Param, Get } from '@nestjs/common';
import { ItineraryService } from './itinerary.service';
import { ItineraryResponseDto } from './dto/itinerary-response.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Itineraries')
@Controller('itineraries')
export class SharedItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @ApiOperation({ summary: 'Get an itinerary by share token' })
  @ApiResponse({ status: 200, type: ItineraryResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not published',
  })
  @ApiParam({
    name: 'shareToken',
    description: 'Share token of the itinerary to retrieve',
  })
  @Get('shared/:shareToken')
  async getItineraryByShareToken(
    @Param('shareToken') shareToken: string,
  ): Promise<ItineraryResponseDto> {
    return this.itineraryService.findByShareToken(shareToken);
  }
}
