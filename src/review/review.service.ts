import { Injectable } from '@nestjs/common';
import { Review } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ReviewNotFoundException } from '../common/exceptions/review-not-found.exception';
import { ReviewAlreadyExistsException } from '../common/exceptions/review-already-exists.exception';
import { CannotReviewOwnItineraryException } from '../common/exceptions/cannot-review-own-itinerary.exception';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewRepository } from './review.repository';
import { ItineraryService } from '../itinerary/itinerary.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly itineraryService: ItineraryService,
  ) {}

  async verifyOwnership(reviewId: string, userId: string): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review || review.userId !== userId) {
      throw new ReviewNotFoundException(reviewId);
    }

    return review;
  }

  async findAllByItineraryId(
    itineraryId: string,
  ): Promise<ReviewResponseDto[]> {
    await this.itineraryService.verifyPublished(itineraryId);

    const reviews =
      await this.reviewRepository.findAllByItineraryId(itineraryId);

    return reviews.map((review) =>
      plainToInstance(ReviewResponseDto, review, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async create(
    itineraryId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    await this.itineraryService.verifyPublished(itineraryId);

    const isOwner = await this.itineraryService.isOwnedBy(itineraryId, userId);

    if (isOwner) {
      throw new CannotReviewOwnItineraryException(itineraryId);
    }

    const existing = await this.reviewRepository.findByUserAndItinerary(
      userId,
      itineraryId,
    );

    if (existing) {
      throw new ReviewAlreadyExistsException(itineraryId);
    }

    const review = await this.reviewRepository.create(itineraryId, userId, dto);

    return plainToInstance(ReviewResponseDto, review, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    reviewId: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    await this.verifyOwnership(reviewId, userId);

    const updated = await this.reviewRepository.update(reviewId, dto);

    return plainToInstance(ReviewResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(reviewId: string, userId: string): Promise<void> {
    await this.verifyOwnership(reviewId, userId);

    await this.reviewRepository.delete(reviewId);
  }
}
