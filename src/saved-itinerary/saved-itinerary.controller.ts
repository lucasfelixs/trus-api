import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SavedItineraryResponseDto } from './dto/saved-itinerary-response.dto';
import { SavedItineraryService } from './saved-itinerary.service';

@ApiTags('Saved Itineraries')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SavedItineraryController {
  constructor(private readonly savedItineraryService: SavedItineraryService) {}

  @ApiOperation({ summary: 'Get all itineraries saved by the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of saved itineraries',
    type: [SavedItineraryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('saved-itineraries')
  getSavedItineraries(
    @CurrentUser() user: User,
  ): Promise<SavedItineraryResponseDto[]> {
    return this.savedItineraryService.findAllByUserId(user.id);
  }

  @ApiOperation({ summary: 'Save a published itinerary' })
  @ApiResponse({
    status: 201,
    description: 'Itinerary saved successfully (idempotent)',
    type: SavedItineraryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not published',
  })
  @ApiParam({ name: 'itineraryId', description: 'ID of the itinerary to save' })
  @Post('itineraries/:itineraryId/saved')
  saveItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<SavedItineraryResponseDto> {
    return this.savedItineraryService.save(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Remove an itinerary from saved itineraries' })
  @ApiResponse({
    status: 204,
    description: 'Itinerary removed from saved itineraries (idempotent)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to unsave',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('itineraries/:itineraryId/saved')
  unsaveItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.savedItineraryService.unsave(itineraryId, user.id);
  }
}
