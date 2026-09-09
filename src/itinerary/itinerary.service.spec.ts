import { Test } from '@nestjs/testing';
import { Itinerary } from '@prisma/client';
import { ItineraryRepository } from './itinerary.repository';
import { ItineraryService } from './itinerary.service';
import { TripsService } from '../trips/trips.service';
import { TripNotFoundException } from '../common/exceptions/trip-not-found.exception';
import type { CreateItineraryDto } from './dto/create-itinerary.dto';
import type { UpdateItineraryDto } from './dto/update-itinerary.dto';
import type { ItineraryResponseDto } from './dto/itinerary-response.dto';

type ItineraryWithTripOwner = Itinerary & { trip: { userId: string } };

const buildItinerary = (
  overrides: Partial<Itinerary> = {},
  tripUserId = 'user-id',
): ItineraryWithTripOwner => ({
  id: 'itinerary-id',
  title: 'Day 1: Arrival',
  description: null,
  shareToken: 'share-token',
  publishedAt: null,
  tripId: 'trip-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
  trip: { userId: tripUserId },
});

const expectedResponse = (
  itinerary: ItineraryWithTripOwner,
): ItineraryResponseDto => ({
  id: itinerary.id,
  title: itinerary.title,
  description: itinerary.description,
  shareToken: itinerary.shareToken,
  createdAt: itinerary.createdAt.toISOString(),
  updatedAt: itinerary.updatedAt.toISOString(),
  publishedAt: itinerary.publishedAt
    ? itinerary.publishedAt.toISOString()
    : null,
});

describe('ItineraryService', () => {
  let service: ItineraryService;
  let repo: jest.Mocked<ItineraryRepository>;
  let tripsService: jest.Mocked<TripsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItineraryService,
        {
          provide: ItineraryRepository,
          useValue: {
            findById: jest.fn(),
            findAllByTripId: jest.fn(),
            findByShareToken: jest.fn(),
            getReviewStats: jest.fn(),
            publishItinerary: jest.fn(),
            unpublishItinerary: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TripsService,
          useValue: {
            verifyOwnership: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ItineraryService);
    repo = module.get(ItineraryRepository);
    tripsService = module.get(TripsService);
  });

  describe('findAllByTripId', () => {
    it('propagates the error when the trip is not owned by the user', async () => {
      tripsService.verifyOwnership.mockRejectedValue(
        new TripNotFoundException('trip-id'),
      );

      await expect(
        service.findAllByTripId('trip-id', 'user-id'),
      ).rejects.toThrow('Trip trip-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findAllByTripId).not.toHaveBeenCalled();
    });

    it('returns all itineraries for the trip', async () => {
      const itineraries = [
        buildItinerary({ id: 'itinerary-1' }),
        buildItinerary({ id: 'itinerary-2' }),
      ];
      repo.findAllByTripId.mockResolvedValue(itineraries);

      const result = await service.findAllByTripId('trip-id', 'user-id');

      expect(result).toEqual(itineraries.map(expectedResponse));
    });

    it('returns an empty array when the trip has no itineraries', async () => {
      repo.findAllByTripId.mockResolvedValue([]);

      const result = await service.findAllByTripId('trip-id', 'user-id');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('throws ItineraryNotFoundException when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('itinerary-id', 'user-id')).rejects.toThrow(
        'Itinerary itinerary-id not found',
      );
    });

    it('throws ItineraryNotFoundException when the user does not own the trip', async () => {
      const itinerary = buildItinerary({}, 'other-user-id');
      repo.findById.mockResolvedValue(itinerary);

      await expect(service.findById('itinerary-id', 'user-id')).rejects.toThrow(
        'Itinerary itinerary-id not found',
      );
    });

    it('returns the itinerary when the user owns the trip', async () => {
      const itinerary = buildItinerary();
      repo.findById.mockResolvedValue(itinerary);
      repo.getReviewStats.mockResolvedValue({
        averageRating: 4.5,
        reviewCount: 2,
      });

      const result = await service.findById('itinerary-id', 'user-id');

      expect(result).toEqual({
        ...expectedResponse(itinerary),
        averageRating: 4.5,
        reviewCount: 2,
      });
    });
  });

  describe('findByShareToken', () => {
    it('throws ItineraryNotFoundException when no published itinerary matches the token', async () => {
      repo.findByShareToken.mockResolvedValue(null);

      await expect(service.findByShareToken('share-token')).rejects.toThrow(
        'Itinerary share-token not found',
      );
    });

    it('returns the itinerary when a published itinerary matches the token', async () => {
      const itinerary = buildItinerary({
        publishedAt: new Date('2026-01-02T00:00:00Z'),
      });
      repo.findByShareToken.mockResolvedValue(itinerary);
      repo.getReviewStats.mockResolvedValue({
        averageRating: null,
        reviewCount: 0,
      });

      const result = await service.findByShareToken('share-token');

      expect(result).toEqual({
        ...expectedResponse(itinerary),
        averageRating: null,
        reviewCount: 0,
      });
    });
  });

  describe('isOwnedBy', () => {
    it('returns false when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.isOwnedBy('itinerary-id', 'user-id');

      expect(result).toBe(false);
    });

    it('returns false when the itinerary belongs to another user', async () => {
      repo.findById.mockResolvedValue(buildItinerary({}, 'other-user-id'));

      const result = await service.isOwnedBy('itinerary-id', 'user-id');

      expect(result).toBe(false);
    });

    it('returns true when the itinerary belongs to the user', async () => {
      repo.findById.mockResolvedValue(buildItinerary({}, 'user-id'));

      const result = await service.isOwnedBy('itinerary-id', 'user-id');

      expect(result).toBe(true);
    });
  });

  describe('publishItinerary', () => {
    it('throws ItineraryNotFoundException when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.publishItinerary('itinerary-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.publishItinerary).not.toHaveBeenCalled();
    });

    it('throws ItineraryNotFoundException when the user does not own the trip', async () => {
      const itinerary = buildItinerary({}, 'other-user-id');
      repo.findById.mockResolvedValue(itinerary);

      await expect(
        service.publishItinerary('itinerary-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');
    });

    it('publishes the itinerary when the user owns the trip', async () => {
      const itinerary = buildItinerary();
      repo.findById.mockResolvedValue(itinerary);

      await service.publishItinerary('itinerary-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.publishItinerary).toHaveBeenCalledWith('itinerary-id');
    });
  });

  describe('unpublishItinerary', () => {
    it('throws ItineraryNotFoundException when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.unpublishItinerary('itinerary-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.unpublishItinerary).not.toHaveBeenCalled();
    });

    it('throws ItineraryNotFoundException when the user does not own the trip', async () => {
      const itinerary = buildItinerary({}, 'other-user-id');
      repo.findById.mockResolvedValue(itinerary);

      await expect(
        service.unpublishItinerary('itinerary-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');
    });

    it('unpublishes the itinerary when the user owns the trip', async () => {
      const itinerary = buildItinerary({
        publishedAt: new Date('2026-01-02T00:00:00Z'),
      });
      repo.findById.mockResolvedValue(itinerary);

      await service.unpublishItinerary('itinerary-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.unpublishItinerary).toHaveBeenCalledWith('itinerary-id');
    });
  });

  describe('create', () => {
    it('propagates the error when the trip is not owned by the user', async () => {
      tripsService.verifyOwnership.mockRejectedValue(
        new TripNotFoundException('trip-id'),
      );

      const dto: CreateItineraryDto = {
        title: 'Day 1',
        description: undefined,
      };

      await expect(service.create('trip-id', 'user-id', dto)).rejects.toThrow(
        'Trip trip-id not found',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates and returns the itinerary', async () => {
      const dto: CreateItineraryDto = {
        title: 'Day 1: Arrival',
        description: undefined,
      };
      const itinerary = buildItinerary();
      repo.create.mockResolvedValue(itinerary);

      const result = await service.create('trip-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith('trip-id', dto);
      expect(result).toEqual(expectedResponse(itinerary));
    });
  });

  describe('update', () => {
    it('throws ItineraryNotFoundException when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('itinerary-id', 'user-id', {}),
      ).rejects.toThrow('Itinerary itinerary-id not found');
    });

    it('throws ItineraryNotFoundException when the user does not own the trip', async () => {
      const itinerary = buildItinerary({}, 'other-user-id');
      repo.findById.mockResolvedValue(itinerary);

      await expect(
        service.update('itinerary-id', 'user-id', {}),
      ).rejects.toThrow('Itinerary itinerary-id not found');
    });

    it('updates and returns the itinerary when the user owns the trip', async () => {
      const itinerary = buildItinerary();
      const updated = buildItinerary({ title: 'Updated title' });
      const dto: UpdateItineraryDto = { title: 'Updated title' };
      repo.findById.mockResolvedValue(itinerary);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('itinerary-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.update).toHaveBeenCalledWith('itinerary-id', dto);
      expect(result).toEqual(expectedResponse(updated));
    });
  });

  describe('delete', () => {
    it('throws ItineraryNotFoundException when the itinerary does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('itinerary-id', 'user-id')).rejects.toThrow(
        'Itinerary itinerary-id not found',
      );
    });

    it('throws ItineraryNotFoundException when the user does not own the trip', async () => {
      const itinerary = buildItinerary({}, 'other-user-id');
      repo.findById.mockResolvedValue(itinerary);

      await expect(service.delete('itinerary-id', 'user-id')).rejects.toThrow(
        'Itinerary itinerary-id not found',
      );
    });

    it('deletes the itinerary when the user owns the trip', async () => {
      const itinerary = buildItinerary();
      repo.findById.mockResolvedValue(itinerary);

      await service.delete('itinerary-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.delete).toHaveBeenCalledWith('itinerary-id');
    });
  });
});
