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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewService } from './review.service';

@ApiTags('Reviews')
@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Get all reviews for a published itinerary' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of reviews for the itinerary',
    type: [ReviewResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not published',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to retrieve reviews for',
  })
  @Get('itineraries/:itineraryId/reviews')
  getReviews(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewService.findAllByItineraryId(itineraryId);
  }

  @ApiOperation({ summary: 'Review a published itinerary' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'The itinerary cannot be reviewed by its own owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Itinerary not found or not published',
  })
  @ApiResponse({
    status: 409,
    description: 'The user has already reviewed this itinerary',
  })
  @ApiParam({
    name: 'itineraryId',
    description: 'ID of the itinerary to review',
  })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('itineraries/:itineraryId/reviews')
  createReview(
    @Param('itineraryId', ParseUUIDPipe) itineraryId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.create(itineraryId, user.id, dto);
  }

  @ApiOperation({ summary: 'Update a review by ID' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Review not found or not owned by the current user',
  })
  @ApiParam({ name: 'reviewId', description: 'ID of the review to update' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('reviews/:reviewId')
  updateReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.update(reviewId, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete a review by ID' })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Review not found or not owned by the current user',
  })
  @ApiParam({ name: 'reviewId', description: 'ID of the review to delete' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('reviews/:reviewId')
  deleteReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.reviewService.delete(reviewId, user.id);
  }
}
