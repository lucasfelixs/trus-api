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
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItineraryResponseDto } from './dto/itinerary-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ItineraryService } from './itinerary.service';

@ApiTags('Itineraries')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @ApiOperation({ summary: 'Get all itineraries for a trip' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of itineraries for the specified trip',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or not owned by the current user',
  })
  @ApiParam({
    name: 'tripId',
    description: 'ID of the trip to retrieve itineraries for',
  })
  @Get('trips/:tripId/itineraries')
  getItinerariesByTripId(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryResponseDto[]> {
    return this.itineraryService.findAllByTripId(tripId, user.id);
  }

  @ApiOperation({ summary: 'Get an itinerary by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the itinerary with the specified ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to retrieve',
  })
  @Get('itineraries/:itineraryId')
  getItineraryById(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<ItineraryResponseDto> {
    return this.itineraryService.findById(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Publish an itinerary' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary published successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to publish',
  })
  @Patch('itineraries/:itineraryId/publish')
  publishItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.itineraryService.publishItinerary(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Unpublish an itinerary' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary unpublished successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to unpublish',
  })
  @Patch('itineraries/:itineraryId/unpublish')
  unpublishItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.itineraryService.unpublishItinerary(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Create a new itinerary for a trip' })
  @ApiResponse({
    status: 201,
    description: 'Itinerary created successfully for the specified trip',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or not owned by the current user',
  })
  @ApiParam({
    name: 'tripId',
    description: 'ID of the trip to create the itinerary for',
  })
  @Post('trips/:tripId/itineraries')
  createItinerary(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateItineraryDto,
  ): Promise<ItineraryResponseDto> {
    return this.itineraryService.create(tripId, user.id, dto);
  }

  @ApiOperation({ summary: 'Update an existing itinerary' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to update',
  })
  @Patch('itineraries/:itineraryId')
  updateItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateItineraryDto,
  ): Promise<ItineraryResponseDto> {
    return this.itineraryService.update(itineraryId, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete an itinerary by ID' })
  @ApiResponse({
    status: 204,
    description: 'Itinerary deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not owned by the current user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to delete',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('itineraries/:itineraryId')
  deleteItinerary(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.itineraryService.delete(itineraryId, user.id);
  }
}
