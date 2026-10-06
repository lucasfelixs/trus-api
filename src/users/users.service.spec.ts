import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { UpsertUserData, UsersRepository } from './users.repository';

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-id',
  email: 'test@example.com',
  name: 'Test User',
  googleId: 'google-1',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            upsertByGoogleId: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  describe('upsertByGoogleId', () => {
    it('delegates to the repository and returns the upserted user', async () => {
      const data: UpsertUserData = {
        googleId: 'google-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const user = buildUser();
      repo.upsertByGoogleId.mockResolvedValue(user);

      const result = await service.upsertByGoogleId(data);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.upsertByGoogleId).toHaveBeenCalledWith(data);
      expect(result).toBe(user);
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);

      const result = await service.findById('user-id');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.findById).toHaveBeenCalledWith('user-id');
      expect(result).toBe(user);
    });

    it('returns null when the user does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.findById('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('maps the authenticated user to the public response contract', () => {
      const result = service.getCurrentUser(buildUser());

      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });
});
