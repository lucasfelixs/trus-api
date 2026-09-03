import { Test } from '@nestjs/testing';
import { Itinerary } from '@prisma/client';
import {
  SavedItineraryRepository,
  SavedItineraryWithItinerary,
} from './saved-itinerary.repository';
import { SavedItineraryService } from './saved-itinerary.service';
import { ItineraryService } from '../itinerary/itinerary.service';
import { ItineraryNotFoundException } from '../common/exceptions/itinerary-not-found.exception';
import type { ItineraryResponseDto } from '../itinerary/dto/itinerary-response.dto';
import type { SavedItineraryResponseDto } from './dto/saved-itinerary-response.dto';

const buildItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: 'itinerary-id',
  title: 'Day 1: Arrival',
  description: null,
  shareToken: 'share-token',
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  tripId: 'trip-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const buildSaved = (
  overrides: Partial<SavedItineraryWithItinerary> = {},
): SavedItineraryWithItinerary => ({
  id: 'saved-id',
  userId: 'user-id',
  itineraryId: 'itinerary-id',
  createdAt: new Date('2026-01-02T00:00:00Z'),
  itinerary: buildItinerary(),
  ...overrides,
});

const toItineraryResponse = (itinerary: Itinerary): ItineraryResponseDto => ({
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

const expectedResponse = (
  saved: SavedItineraryWithItinerary,
): SavedItineraryResponseDto => ({
  id: saved.id,
  createdAt: saved.createdAt.toISOString(),
  itinerary: toItineraryResponse(saved.itinerary),
});

describe('SavedItineraryService', () => {
  let service: SavedItineraryService;
  let repo: jest.Mocked<SavedItineraryRepository>;
  let itineraryService: jest.Mocked<ItineraryService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SavedItineraryService,
        {
          provide: SavedItineraryRepository,
          useValue: {
            upsert: jest.fn(),
            deleteIfExists: jest.fn(),
            findAllByUserId: jest.fn(),
          },
        },
        {
          provide: ItineraryService,
          useValue: {
            verifyPublished: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SavedItineraryService);
    repo = module.get(SavedItineraryRepository);
    itineraryService = module.get(ItineraryService);
  });

  describe('save', () => {
    it('propagates the error when the itinerary is not published or does not exist', async () => {
      itineraryService.verifyPublished.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      await expect(service.save('itinerary-id', 'user-id')).rejects.toThrow(
        'Itinerary itinerary-id not found',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('saves and returns the saved itinerary', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        toItineraryResponse(buildItinerary()),
      );
      const saved = buildSaved();
      repo.upsert.mockResolvedValue(saved);

      const result = await service.save('itinerary-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.upsert).toHaveBeenCalledWith('user-id', 'itinerary-id');
      expect(result).toEqual(expectedResponse(saved));
    });

    it('is idempotent when the itinerary is already saved', async () => {
      itineraryService.verifyPublished.mockResolvedValue(
        toItineraryResponse(buildItinerary()),
      );
      const saved = buildSaved();
      repo.upsert.mockResolvedValue(saved);

      const first = await service.save('itinerary-id', 'user-id');
      const second = await service.save('itinerary-id', 'user-id');

      expect(first).toEqual(second);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('unsave', () => {
    it('deletes the saved itinerary when it exists', async () => {
      await service.unsave('itinerary-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.deleteIfExists).toHaveBeenCalledWith(
        'user-id',
        'itinerary-id',
      );
    });

    it('does not throw when the itinerary was never saved', async () => {
      repo.deleteIfExists.mockResolvedValue(undefined);

      await expect(
        service.unsave('itinerary-id', 'user-id'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findAllByUserId', () => {
    it('returns an empty array when the user has no saved itineraries', async () => {
      repo.findAllByUserId.mockResolvedValue([]);

      const result = await service.findAllByUserId('user-id');

      expect(result).toEqual([]);
    });

    it('returns all saved itineraries for the user', async () => {
      const saved = [
        buildSaved({ id: 'saved-1' }),
        buildSaved({ id: 'saved-2' }),
      ];
      repo.findAllByUserId.mockResolvedValue(saved);

      const result = await service.findAllByUserId('user-id');

      expect(result).toEqual(saved.map(expectedResponse));
    });
  });
});
