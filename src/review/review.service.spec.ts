import { Test } from '@nestjs/testing';
import { Review } from '@prisma/client';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';
import { ItineraryService } from '../itinerary/itinerary.service';
import { ItineraryNotFoundException } from '../common/exceptions/itinerary-not-found.exception';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import type { ItineraryResponseDto } from '../itinerary/dto/itinerary-response.dto';

const buildReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'review-id',
  rating: 5,
  comment: 'Great itinerary!',
  userId: 'user-id',
  itineraryId: 'itinerary-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const expectedResponse = (review: Review): ReviewResponseDto => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  userId: review.userId,
  itineraryId: review.itineraryId,
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
});

describe('ReviewService', () => {
  let service: ReviewService;
  let repo: jest.Mocked<ReviewRepository>;
  let itineraryService: jest.Mocked<ItineraryService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: ReviewRepository,
          useValue: {
            findById: jest.fn(),
            findByUserAndItinerary: jest.fn(),
            findAllByItineraryId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ItineraryService,
          useValue: {
            verifyPublished: jest.fn(),
            isOwnedBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ReviewService);
    repo = module.get(ReviewRepository);
    itineraryService = module.get(ItineraryService);
  });

  describe('findAllByItineraryId', () => {
    it('propagates the error when the itinerary is not published', async () => {
      itineraryService.verifyPublished.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      await expect(
        service.findAllByItineraryId('itinerary-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findAllByItineraryId).not.toHaveBeenCalled();
    });

    it('returns all reviews for the itinerary', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        {} as ItineraryResponseDto,
      );
      const reviews = [
        buildReview({ id: 'review-1' }),
        buildReview({ id: 'review-2' }),
      ];
      repo.findAllByItineraryId.mockResolvedValue(reviews);

      const result = await service.findAllByItineraryId('itinerary-id');

      expect(result).toEqual(reviews.map(expectedResponse));
    });
  });

  describe('create', () => {
    it('propagates the error when the itinerary is not published', async () => {
      itineraryService.verifyPublished.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      const dto: CreateReviewDto = { rating: 5, comment: undefined };

      await expect(
        service.create('itinerary-id', 'user-id', dto),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws CannotReviewOwnItineraryException when the user owns the itinerary', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        {} as ItineraryResponseDto,
      );
      itineraryService.isOwnedBy.mockResolvedValue(true);

      const dto: CreateReviewDto = { rating: 5, comment: undefined };

      await expect(
        service.create('itinerary-id', 'user-id', dto),
      ).rejects.toThrow(
        'Itinerary itinerary-id cannot be reviewed by its own owner',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws ReviewAlreadyExistsException when the user already reviewed the itinerary', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        {} as ItineraryResponseDto,
      );
      itineraryService.isOwnedBy.mockResolvedValue(false);
      repo.findByUserAndItinerary.mockResolvedValue(buildReview());

      const dto: CreateReviewDto = { rating: 5, comment: undefined };

      await expect(
        service.create('itinerary-id', 'user-id', dto),
      ).rejects.toThrow(
        'Itinerary itinerary-id already has a review from this user',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates and returns the review', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        {} as ItineraryResponseDto,
      );
      itineraryService.isOwnedBy.mockResolvedValue(false);
      repo.findByUserAndItinerary.mockResolvedValue(null);
      const dto: CreateReviewDto = { rating: 5, comment: 'Amazing' };
      const review = buildReview();
      repo.create.mockResolvedValue(review);

      const result = await service.create('itinerary-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith('itinerary-id', 'user-id', dto);
      expect(result).toEqual(expectedResponse(review));
    });
  });

  describe('update', () => {
    it('throws ReviewNotFoundException when the review does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('review-id', 'user-id', {})).rejects.toThrow(
        'Review review-id not found',
      );
    });

    it('throws ReviewNotFoundException when the review belongs to another user', async () => {
      repo.findById.mockResolvedValue(buildReview({ userId: 'other-user-id' }));

      await expect(service.update('review-id', 'user-id', {})).rejects.toThrow(
        'Review review-id not found',
      );
    });

    it('updates and returns the review when owned by the user', async () => {
      const review = buildReview();
      const updated = buildReview({ rating: 3, comment: 'Updated' });
      const dto: UpdateReviewDto = { rating: 3, comment: 'Updated' };
      repo.findById.mockResolvedValue(review);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('review-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.update).toHaveBeenCalledWith('review-id', dto);
      expect(result).toEqual(expectedResponse(updated));
    });
  });

  describe('delete', () => {
    it('throws ReviewNotFoundException when the review does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('review-id', 'user-id')).rejects.toThrow(
        'Review review-id not found',
      );
    });

    it('throws ReviewNotFoundException when the review belongs to another user', async () => {
      repo.findById.mockResolvedValue(buildReview({ userId: 'other-user-id' }));

      await expect(service.delete('review-id', 'user-id')).rejects.toThrow(
        'Review review-id not found',
      );
    });

    it('deletes the review when owned by the user', async () => {
      repo.findById.mockResolvedValue(buildReview());

      await service.delete('review-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.delete).toHaveBeenCalledWith('review-id');
    });
  });
});
