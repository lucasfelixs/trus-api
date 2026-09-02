import { Test } from '@nestjs/testing';
import { ItineraryDay, ItineraryStop } from '@prisma/client';
import { ItineraryStopRepository } from './itinerary-stop.repository';
import { ItineraryStopService } from './itinerary-stop.service';
import { ItineraryDayService } from '../itinerary-day/itinerary-day.service';
import { ItineraryDayNotFoundException } from '../common/exceptions/itinerary-day-not-found.exception';
import type { CreateItineraryStopDto } from './dto/create-itinerary-stop.dto';
import type { UpdateItineraryStopDto } from './dto/update-itinerary-stop.dto';
import type { ItineraryStopResponseDto } from './dto/itinerary-stop-response.dto';

const buildStop = (overrides: Partial<ItineraryStop> = {}): ItineraryStop => ({
  id: 'stop-id',
  name: 'Eiffel Tower',
  googlePlaceId: 'place-id',
  location: '48.8583701,2.2944813',
  order: 1,
  note: null,
  scheduledTime: null,
  itineraryDayId: 'day-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const buildDay = (overrides: Partial<ItineraryDay> = {}): ItineraryDay => ({
  id: 'day-id',
  title: 'Day 1',
  date: new Date('2026-01-01T00:00:00Z'),
  itineraryId: 'itinerary-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const expectedResponse = (stop: ItineraryStop): ItineraryStopResponseDto => ({
  id: stop.id,
  name: stop.name,
  googlePlaceId: stop.googlePlaceId,
  location: stop.location,
  order: stop.order,
  note: stop.note,
  scheduledTime: stop.scheduledTime ? stop.scheduledTime.toISOString() : null,
  itineraryDayId: stop.itineraryDayId,
  createdAt: stop.createdAt.toISOString(),
  updatedAt: stop.updatedAt.toISOString(),
});

describe('ItineraryStopService', () => {
  let service: ItineraryStopService;
  let repo: jest.Mocked<ItineraryStopRepository>;
  let itineraryDayService: jest.Mocked<ItineraryDayService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ItineraryStopService,
        {
          provide: ItineraryStopRepository,
          useValue: {
            findById: jest.fn(),
            findAllByItineraryDayId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ItineraryDayService,
          useValue: {
            verifyOwnership: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ItineraryStopService);
    repo = module.get(ItineraryStopRepository);
    itineraryDayService = module.get(ItineraryDayService);
  });

  describe('findById', () => {
    it('throws ItineraryStopNotFoundException when the stop does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('stop-id', 'user-id')).rejects.toThrow(
        'Itinerary stop stop-id not found',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(itineraryDayService.verifyOwnership).not.toHaveBeenCalled();
    });

    it('propagates the error when the parent day is not owned by the user', async () => {
      repo.findById.mockResolvedValue(buildStop());
      itineraryDayService.verifyOwnership.mockRejectedValue(
        new ItineraryDayNotFoundException('day-id'),
      );

      await expect(service.findById('stop-id', 'user-id')).rejects.toThrow(
        'Itinerary day day-id not found',
      );
    });

    it('returns the stop when owned by the user', async () => {
      const stop = buildStop();
      repo.findById.mockResolvedValue(stop);
      itineraryDayService.verifyOwnership.mockResolvedValue(buildDay());

      const result = await service.findById('stop-id', 'user-id');

      expect(result).toEqual(expectedResponse(stop));
    });
  });

  describe('findAllByItineraryDayId', () => {
    it('propagates the error when the day is not owned by the user', async () => {
      itineraryDayService.verifyOwnership.mockRejectedValue(
        new ItineraryDayNotFoundException('day-id'),
      );

      await expect(
        service.findAllByItineraryDayId('day-id', 'user-id'),
      ).rejects.toThrow('Itinerary day day-id not found');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findAllByItineraryDayId).not.toHaveBeenCalled();
    });

    it('returns all stops for the day', async () => {
      itineraryDayService.verifyOwnership.mockResolvedValue(buildDay());
      const stops = [buildStop({ id: 'stop-1' }), buildStop({ id: 'stop-2' })];
      repo.findAllByItineraryDayId.mockResolvedValue(stops);

      const result = await service.findAllByItineraryDayId('day-id', 'user-id');

      expect(result).toEqual(stops.map(expectedResponse));
    });
  });

  describe('create', () => {
    it('propagates the error when the day is not owned by the user', async () => {
      itineraryDayService.verifyOwnership.mockRejectedValue(
        new ItineraryDayNotFoundException('day-id'),
      );

      const dto: CreateItineraryStopDto = {
        name: 'Eiffel Tower',
        googlePlaceId: 'place-id',
        location: '48.8583701,2.2944813',
        order: 1,
        note: undefined,
        scheduledTime: undefined,
      };

      await expect(service.create('day-id', 'user-id', dto)).rejects.toThrow(
        'Itinerary day day-id not found',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates and returns the stop', async () => {
      itineraryDayService.verifyOwnership.mockResolvedValue(buildDay());
      const dto: CreateItineraryStopDto = {
        name: 'Eiffel Tower',
        googlePlaceId: 'place-id',
        location: '48.8583701,2.2944813',
        order: 1,
        note: undefined,
        scheduledTime: undefined,
      };
      const stop = buildStop();
      repo.create.mockResolvedValue(stop);

      const result = await service.create('day-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith('day-id', dto);
      expect(result).toEqual(expectedResponse(stop));
    });
  });

  describe('update', () => {
    it('throws ItineraryStopNotFoundException when the stop does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('stop-id', 'user-id', {})).rejects.toThrow(
        'Itinerary stop stop-id not found',
      );
    });

    it('updates and returns the stop when owned by the user', async () => {
      const stop = buildStop();
      const updated = buildStop({ name: 'Updated name' });
      const dto: UpdateItineraryStopDto = { name: 'Updated name' };
      repo.findById.mockResolvedValue(stop);
      itineraryDayService.verifyOwnership.mockResolvedValue(buildDay());
      repo.update.mockResolvedValue(updated);

      const result = await service.update('stop-id', 'user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.update).toHaveBeenCalledWith('stop-id', dto);
      expect(result).toEqual(expectedResponse(updated));
    });
  });

  describe('delete', () => {
    it('throws ItineraryStopNotFoundException when the stop does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('stop-id', 'user-id')).rejects.toThrow(
        'Itinerary stop stop-id not found',
      );
    });

    it('deletes the stop when owned by the user', async () => {
      repo.findById.mockResolvedValue(buildStop());
      itineraryDayService.verifyOwnership.mockResolvedValue(buildDay());

      await service.delete('stop-id', 'user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.delete).toHaveBeenCalledWith('stop-id');
    });
  });
});
