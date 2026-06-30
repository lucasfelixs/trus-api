import { Test } from '@nestjs/testing';
import { TripsRepository } from './trips.repository';
import { TripsService } from './trips.service';

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

  it('should throw TripNotFoundException when trip does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findById('user-id', 'trip-id')).rejects.toThrow(
      'Trip trip-id not found',
    );
  });
});
