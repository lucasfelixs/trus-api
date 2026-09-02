import { Test } from '@nestjs/testing';
import { ItineraryDay } from '@prisma/client';
import { ItineraryDayRepository } from './itinerary-day.repository';
import { ItineraryDayService } from './itinerary-day.service';
import { ItineraryService } from '../itinerary/itinerary.service';
import { ItineraryNotFoundException } from '../common/exceptions/itinerary-not-found.exception';
import type { CreateItineraryDayDto } from './dto/create-itinerary-day.dto';
import type { UpdateItineraryDayDto } from './dto/update-itinerary-day.dto';
import type { ItineraryDayResponseDto } from './dto/itinerary-day-response.dto';

const buildDay = (overrides: Partial<ItineraryDay> = {}): ItineraryDay => ({
  id: 'day-id',
  title: 'Day 1: Arrival',
  date: new Date('2026-01-01T00:00:00Z'),
  itineraryId: 'itinerary-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const expectedResponse = (day: ItineraryDay): ItineraryDayResponseDto => ({
  id: day.id,
  title: day.title,
  date: day.date.toISOString(),
  createdAt: day.createdAt.toISOString(),
  updatedAt: day.updatedAt.toISOString(),
});

describe('ItineraryDayService', () => {
  let service: ItineraryDayService;
  let repo: jest.Mocked<ItineraryDayRepository>;
  let itineraryService: jest.Mocked<ItineraryService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItineraryDayService,
        {
          provide: ItineraryDayRepository,
          useValue: {
            findById: jest.fn(),
            findAllByItineraryId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ItineraryService,
          useValue: {
            verifyOwnership: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ItineraryDayService);
    repo = module.get(ItineraryDayRepository);
    itineraryService = module.get(ItineraryService);
  });

  describe('verifyOwnership', () => {
    it('throws ItineraryDayNotFoundException when the day does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.verifyOwnership('day-id', 'user-id'),
      ).rejects.toThrow('Itinerary day day-id not found');
    });

    it('propagates the error when the parent itinerary is not owned by the user', async () => {
      repo.findById.mockResolvedValue(buildDay());
      itineraryService.verifyOwnership.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      await expect(
        service.verifyOwnership('day-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');
    });

    it('returns the day when the parent itinerary is owned by the user', async () => {
      const day = buildDay();
      repo.findById.mockResolvedValue(day);
      itineraryService.verifyOwnership.mockResolvedValue({
        id: 'itinerary-id',
        title: 'Trip itinerary',
        description: null,
        shareToken: 'share-token',
        publishedAt: null,
        tripId: 'trip-id',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        trip: { userId: 'user-id' },
      });

      const result = await service.verifyOwnership('day-id', 'user-id');

      expect(result).toEqual(day);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(itineraryService.verifyOwnership).toHaveBeenCalledWith(
        'itinerary-id',
        'user-id',
      );
    });
  });

  describe('findById', () => {
    it('throws ItineraryDayNotFoundException when the day does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('day-id', 'user-id')).rejects.toThrow(
        'Itinerary day day-id not found',
      );
    });

    it('returns the day when owned by the user', async () => {
      const day = buildDay();
      repo.findById.mockResolvedValue(day);

      const result = await service.findById('day-id', 'user-id');

      expect(result).toEqual(expectedResponse(day));
    });
  });

  describe('findAllByItineraryId', () => {
    it('propagates the error when the itinerary is not owned by the user', async () => {
      itineraryService.verifyOwnership.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      await expect(
        service.findAllByItineraryId('itinerary-id', 'user-id'),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findAllByItineraryId).not.toHaveBeenCalled();
    });

    it('returns all days for the itinerary', async () => {
      const days = [buildDay({ id: 'day-1' }), buildDay({ id: 'day-2' })];
      repo.findAllByItineraryId.mockResolvedValue(days);

      const result = await service.findAllByItineraryId(
        'itinerary-id',
        'user-id',
      );

      expect(result).toEqual(days.map(expectedResponse));
    });
  });

  describe('create', () => {
    it('propagates the error when the itinerary is not owned by the user', async () => {
      itineraryService.verifyOwnership.mockRejectedValue(
        new ItineraryNotFoundException('itinerary-id'),
      );

      const dto: CreateItineraryDayDto = { title: 'Day 1', date: '2026-01-01' };

      await expect(
        service.create('itinerary-id', 'user-id', dto),
      ).rejects.toThrow('Itinerary itinerary-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates and returns the day', async () => {
      const dto: CreateItineraryDayDto = { title: 'Day 1', date: '2026-01-01' };
      const day = buildDay();
      repo.create.mockResolvedValue(day);

      const result = await service.create('itinerary-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith('itinerary-id', dto);
      expect(result).toEqual(expectedResponse(day));
    });
  });

  describe('update', () => {
    it('throws ItineraryDayNotFoundException when the day does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('day-id', 'user-id', {})).rejects.toThrow(
        'Itinerary day day-id not found',
      );
    });

    it('updates and returns the day when owned by the user', async () => {
      const day = buildDay();
      const updated = buildDay({ title: 'Updated title' });
      const dto: UpdateItineraryDayDto = { title: 'Updated title' };
      repo.findById.mockResolvedValue(day);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('day-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.update).toHaveBeenCalledWith('day-id', dto);
      expect(result).toEqual(expectedResponse(updated));
    });
  });

  describe('delete', () => {
    it('throws ItineraryDayNotFoundException when the day does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('day-id', 'user-id')).rejects.toThrow(
        'Itinerary day day-id not found',
      );
    });

    it('deletes the day when owned by the user', async () => {
      repo.findById.mockResolvedValue(buildDay());

      await service.delete('day-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.delete).toHaveBeenCalledWith('day-id');
    });
  });
});
