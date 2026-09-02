import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateItineraryStopDto } from './dto/create-itinerary-stop.dto';
import { UpdateItineraryStopDto } from './dto/update-itinerary-stop.dto';
import { ItineraryStopResponseDto } from './dto/itinerary-stop-response.dto';
import { ItineraryStopService } from './itinerary-stop.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Itinerary Stops')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ItineraryStopController {
  constructor(private readonly itineraryStopService: ItineraryStopService) {}

  @ApiOperation({ summary: 'Get all stops for an itinerary day' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of stops for the specified itinerary day',
    type: [ItineraryStopResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiParam({
    name: 'dayId',
    description: 'ID of the itinerary day to retrieve stops for',
  })
  @Get('itinerary-days/:dayId/stops')
  getStopsByDayId(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryStopResponseDto[]> {
    return this.itineraryStopService.findAllByItineraryDayId(dayId, user.id);
  }

  @ApiOperation({ summary: 'Get an itinerary stop by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the itinerary stop with the specified ID',
    type: ItineraryStopResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary stop not found or not owned by the current user',
  })
  @ApiParam({
    name: 'stopId',
    description: 'ID of the itinerary stop to retrieve',
  })
  @Get('itinerary-stops/:stopId')
  getStopById(
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryStopResponseDto> {
    return this.itineraryStopService.findById(stopId, user.id);
  }

  @ApiOperation({ summary: 'Create a new stop for an itinerary day' })
  @ApiResponse({
    status: 201,
    description: 'Itinerary stop created successfully',
    type: ItineraryStopResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiParam({
    name: 'dayId',
    description: 'ID of the itinerary day to create a stop for',
  })
  @Post('itinerary-days/:dayId/stops')
  createStop(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateItineraryStopDto,
  ): Promise<ItineraryStopResponseDto> {
    return this.itineraryStopService.create(dayId, user.id, dto);
  }

  @ApiOperation({ summary: 'Update an itinerary stop by ID' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary stop updated successfully',
    type: ItineraryStopResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary stop not found or not owned by the current user',
  })
  @ApiParam({
    name: 'stopId',
    description: 'ID of the itinerary stop to update',
  })
  @Patch('itinerary-stops/:stopId')
  updateStop(
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateItineraryStopDto,
  ): Promise<ItineraryStopResponseDto> {
    return this.itineraryStopService.update(stopId, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete an itinerary stop by ID' })
  @ApiResponse({
    status: 204,
    description: 'Itinerary stop deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary stop not found or not owned by the current user',
  })
  @ApiParam({
    name: 'stopId',
    description: 'ID of the itinerary stop to delete',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('itinerary-stops/:stopId')
  deleteStop(
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.itineraryStopService.delete(stopId, user.id);
  }
}
