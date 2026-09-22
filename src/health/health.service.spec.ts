import { Test } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(HealthService);
  });

  it('returns ok when the database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result).toEqual({ status: 'ok' });
  });

  it('propagates the error when the database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).rejects.toThrow('connection refused');
  });
});
