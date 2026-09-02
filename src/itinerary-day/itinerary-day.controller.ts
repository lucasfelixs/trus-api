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
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { ItineraryDayResponseDto } from './dto/itinerary-day-response.dto';
import { ItineraryDayService } from './itinerary-day.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Itinerary Days')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ItineraryDayController {
  constructor(private readonly itineraryDayService: ItineraryDayService) {}

  @ApiOperation({ summary: 'Get all itinerary days for an itinerary' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of itinerary days for the specified itinerary',
    type: [ItineraryDayResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to retrieve days for',
  })
  @Get('itineraries/:itineraryId/days')
  getDaysByItineraryId(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryDayResponseDto[]> {
    return this.itineraryDayService.findAllByItineraryId(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Get an itinerary day by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the itinerary day with the specified ID',
    type: ItineraryDayResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiParam({
    name: 'dayId',
    description: 'ID of the itinerary day to retrieve',
  })
  @Get('itinerary-days/:dayId')
  getDayById(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryDayResponseDto> {
    return this.itineraryDayService.findById(dayId, user.id);
  }

  @ApiOperation({ summary: 'Create a new itinerary day for an itinerary' })
  @ApiResponse({
    status: 201,
    description: 'Itinerary day created successfully',
    type: ItineraryDayResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to create a day for',
  })
  @Post('itineraries/:itineraryId/days')
  createDay(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateItineraryDayDto,
  ): Promise<ItineraryDayResponseDto> {
    return this.itineraryDayService.create(itineraryId, user.id, dto);
  }

  @ApiOperation({ summary: 'Update an itinerary day by ID' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary day updated successfully',
    type: ItineraryDayResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiParam({ name: 'dayId', description: 'ID of the itinerary day to update' })
  @Patch('itinerary-days/:dayId')
  updateDay(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateItineraryDayDto,
  ): Promise<ItineraryDayResponseDto> {
    return this.itineraryDayService.update(dayId, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete an itinerary day by ID' })
  @ApiResponse({
    status: 204,
    description: 'Itinerary day deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiParam({ name: 'dayId', description: 'ID of the itinerary day to delete' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('itinerary-days/:dayId')
  deleteDay(
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.itineraryDayService.delete(dayId, user.id);
  }
}
