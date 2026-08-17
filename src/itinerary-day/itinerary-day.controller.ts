import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import { ItineraryDayService } from './itinerary-day.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Itinerary Day')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('itinerary-day')
export class ItineraryDayController {
  constructor(private readonly itineraryDayService: ItineraryDayService) {}

  @ApiOperation({ summary: 'Get an itinerary day by ID' })
  @ApiResponse({ status: 200, description: 'Returns an itinerary day by ID' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', description: 'ID of the itinerary day to retrieve' })
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.itineraryDayService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Get all itinerary days by itinerary ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of itinerary days by itinerary ID',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to retrieve days for',
  })
  @Get('itinerary/:itineraryId')
  async findAllByItineraryId(
    @Param('itineraryId') itineraryId: string,
    @CurrentUser() user: User,
  ) {
    return this.itineraryDayService.findAllByItineraryId(itineraryId, user.id);
  }

  @ApiOperation({ summary: 'Create a new itinerary day' })
  @ApiResponse({
    status: 201,
    description: 'Itinerary day created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to create a day for',
  })
  @Post('itinerary/:itineraryId')
  async create(
    @Param('itineraryId') itineraryId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateItineraryDayDto,
  ) {
    return this.itineraryDayService.create(itineraryId, user.id, dto);
  }

  @ApiOperation({ summary: 'Update an itinerary day by ID' })
  @ApiResponse({
    status: 200,
    description: 'Itinerary day updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Itinerary day not found or not owned by the current user',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', description: 'ID of the itinerary day to update' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateItineraryDayDto,
  ) {
    return this.itineraryDayService.update(id, user.id, dto);
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
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', description: 'ID of the itinerary day to delete' })
  @Delete(':id/delete')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.itineraryDayService.delete(id, user.id);
  }
}
