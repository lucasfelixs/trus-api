import { Test } from '@nestjs/testing';
import { TripsRepository } from './trips.repository';
import { TripsService } from './trips.service';
import type { Trip } from '@prisma/client';
import type { CreateTripDto } from './dto/create-trip.dto';
import type { UpdateTripDto } from './dto/update-trip.dto';
import type { TripResponseDto } from './dto/trip-response.dto';

const buildTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-id',
  title: 'Trip to Paris',
  destination: 'Paris',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-07'),
  coverImageUrl: null,
  userId: 'user-id',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const expectedResponse = (trip: Trip): TripResponseDto => ({
  id: trip.id,
  title: trip.title,
  destination: trip.destination,
  startDate: trip.startDate,
  endDate: trip.endDate,
  createdAt: trip.createdAt,
  updatedAt: trip.updatedAt,
});

describe('TripsService', () => {
  let service: TripsService;
  let repo: jest.Mocked<TripsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: TripsRepository,
          useValue: {
            findById: jest.fn(),
            findAllByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TripsService);
    repo = module.get(TripsRepository);
  });

  describe('findById', () => {
    it('should throw TripNotFoundException when trip does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('user-id', 'trip-id')).rejects.toThrow(
        'Trip trip-id not found',
      );
    });

    it('should throw ForbiddenException when user does not own the trip', async () => {
      const trip = buildTrip({ userId: 'other-user-id' });
      repo.findById.mockResolvedValue(trip);

      await expect(service.findById('user-id', 'trip-id')).rejects.toThrow(
        'You do not have permission to access this trip',
      );
    });

    it('should return trip when user owns the trip', async () => {
      const trip = buildTrip();
      repo.findById.mockResolvedValue(trip);

      const result = await service.findById('user-id', 'trip-id');

      expect(result).toEqual(expectedResponse(trip));
    });
  });

  describe('findAll', () => {
    it('should return all trips for a user', async () => {
      const trips = [buildTrip({ id: 'trip-1' }), buildTrip({ id: 'trip-2' })];
      repo.findAllByUserId.mockResolvedValue(trips);

      const result = await service.findAll('user-id');

      expect(result).toEqual(trips.map(expectedResponse));
    });

    it('should return an empty array when the user has no trips', async () => {
      repo.findAllByUserId.mockResolvedValue([]);

      const result = await service.findAll('user-id');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return the trip', async () => {
      const dto: CreateTripDto = {
        title: 'Trip to Paris',
        destination: 'Paris',
        startDate: '2026-01-01',
        endDate: '2026-01-07',
      };
      const trip = buildTrip();
      repo.create.mockResolvedValue(trip);

      const result = await service.create('user-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.create).toHaveBeenCalledWith('user-id', dto);
      expect(result).toEqual(expectedResponse(trip));
    });
  });

  describe('update', () => {
    it('should throw TripNotFoundException when trip does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('user-id', 'trip-id', {})).rejects.toThrow(
        'Trip trip-id not found',
      );
    });

    it('should throw ForbiddenException when user does not own the trip', async () => {
      const trip = buildTrip({ userId: 'other-user-id' });
      repo.findById.mockResolvedValue(trip);

      await expect(service.update('user-id', 'trip-id', {})).rejects.toThrow(
        'You do not have permission to access this trip',
      );
    });

    it('should update and return the trip when user owns it', async () => {
      const trip = buildTrip();
      const updated = buildTrip({ title: 'Updated title' });
      const dto: UpdateTripDto = { title: 'Updated title' };
      repo.findById.mockResolvedValue(trip);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('user-id', 'trip-id', dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.update).toHaveBeenCalledWith('trip-id', dto);
      expect(result).toEqual(expectedResponse(updated));
    });
  });

  describe('delete', () => {
    it('should throw TripNotFoundException when trip does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('user-id', 'trip-id')).rejects.toThrow(
        'Trip trip-id not found',
      );
    });

    it('should throw ForbiddenException when user does not own the trip', async () => {
      const trip = buildTrip({ userId: 'other-user-id' });
      repo.findById.mockResolvedValue(trip);

      await expect(service.delete('user-id', 'trip-id')).rejects.toThrow(
        'You do not have permission to access this trip',
      );
    });

    it('should delete the trip when user owns it', async () => {
      const trip = buildTrip();
      repo.findById.mockResolvedValue(trip);

      await service.delete('user-id', 'trip-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.delete).toHaveBeenCalledWith('trip-id');
    });
  });
});
